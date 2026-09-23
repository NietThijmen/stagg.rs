# Local Kubernetes setup

This document describes how to bring up the Stagg.rs data plane on the local
k3s cluster that ships in `docker-compose.yml`, and records the fixes applied to
make that setup work. It complements `k8s/README.md`, which describes the
production data plane (Envoy Gateway, cert-manager, ExternalDNS, ClickHouse
Cloud, etc.).

The local setup is deliberately different from production:

| Concern | Production | Local dev |
| --- | --- | --- |
| Cluster | Managed / k3s VM | `rancher/k3s` in Docker (`docker-compose.yml`) |
| TLS | cert-manager + Let's Encrypt (DNS-01) | Self-signed `public-gateway-tls` secret |
| DNS | ExternalDNS (Cloudflare) | none; use `/etc/hosts` or `curl --resolve` |
| Postgres | Managed / operator | `postgres` container on host port 5433 |
| ClickHouse | ClickHouse Cloud / operator | `clickhouse` container on host ports 8123/9000 |
| Envoy Gateway | Helm chart | `envoy-gateway` install manifests (v1.1.0) |

---

## 1. Local infrastructure

```bash
docker compose up -d
```

This starts:

- `postgres` (host `5433`) – control plane database
- `clickhouse` (host `8123`/`9000`) – analytics
- `k3s-server` (host `6443`) – the Kubernetes cluster

`k3s-server` writes a kubeconfig to `./.kubeconfig/kubeconfig.yaml`. The repo
root `.env` already points `KUBECONFIG` at it:

```bash
KUBECONFIG=/Users/<you>/code/stagg.rs/.kubeconfig/kubeconfig.yaml
```

### k3s container resilience

Two settings in `docker-compose.yml` keep the k3s container healthy across host
suspend/resume:

- `restart: unless-stopped`
- a persistent `machine-id` bind mount (`./.kubeconfig/machine-id:/etc/machine-id`)

Without the `machine-id` mount, kubelet logs
`Failed to get system UUID: open /etc/machine-id: no such file or directory`
on every startup. It is harmless but noisy. The file must be a 32-character hex
string and is created once:

```bash
mkdir -p .kubeconfig
uuidgen | tr '[:upper:]' '[:lower:]' | tr -d '-' > .kubeconfig/machine-id
```

### Host sleep and expired service-account tokens

When the host sleeps, the k3s container freezes. On wake the clock has jumped
forward, kubelet's projected service-account tokens are stale, and the API
server logs:

```
"Unable to authenticate the request" err="[invalid bearer token, service account token has expired]"
```

This is expected with clock jumps (see k3s#6555, k3s#4221). The fix is to restart
the cluster and then restart any control-plane process that cached a client:

```bash
docker compose restart k3s-server
```

If the cluster state is corrupt, recreate it (this deletes the volume and all
in-cluster resources):

```bash
docker compose stop k3s-server
docker compose rm -f k3s-server
docker volume rm staggrs_k3s-server-data   # note: project name has no dot
docker compose up -d k3s-server
```

> **Important:** the reconciler and worker build their Kubernetes client once at
> process start. After recreating the cluster they hold the old cluster CA and
> fail with `self-signed certificate in certificate chain` / `HTTP request
> failed`. Restart them (see §6).

---

## 2. Platform controllers

The data-plane manifests assume the Gateway API CRDs and Envoy Gateway are
installed.

```bash
export KUBECONFIG="$PWD/.kubeconfig/kubeconfig.yaml"

# Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml

# Envoy Gateway v1.1.0
# --server-side is required: the EnvoyProxy CRD exceeds the client-side apply
# annotation limit (262144 bytes).
kubectl apply --server-side --force-conflicts \
  -f https://github.com/envoyproxy/gateway/releases/download/v1.1.0/install.yaml

kubectl -n envoy-gateway-system rollout status deploy/envoy-gateway
```

Helm is not required; the released `install.yaml` is sufficient and avoids a
Helm dependency for local dev.

---

## 3. Data plane

Apply per component. Do **not** run `kubectl apply -k k8s/` locally: the
kustomization includes cert-manager and ExternalDNS manifests that reference
placeholder Cloudflare tokens and an ACME email.

```bash
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/envoy-ingress/
kubectl apply -f k8s/observability/
kubectl apply -f k8s/local/           # local-dev only (see §4)
```

### Gateway TLS secret

The Gateway listener references a `public-gateway-tls` secret in `edge-system`.
cert-manager is not used locally, so create a self-signed certificate:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /tmp/tls.key -out /tmp/tls.crt -subj "/CN=*.saas.example"
kubectl create secret tls public-gateway-tls \
  --cert=/tmp/tls.crt --key=/tmp/tls.key -n edge-system
```

Once the Gateway and EnvoyProxy are accepted, Envoy Gateway provisions an Envoy
deployment:

```bash
kubectl get gateway -n edge-system public-gateway
kubectl get pods -n envoy-gateway-system -l gateway.envoyproxy.io/owning-gateway-name=public-gateway
```

> `PROGRAMMED` may stay `False` with reason `AddressNotAssigned`. k3s servicelb is
> disabled in `docker-compose.yml`, so the Envoy Service is `ClusterIP` and has no
> external address. The proxy still routes; this is cosmetic locally.

---

## 4. Local-dev specifics

### ClickHouse bridge (`k8s/local/00-clickhouse-bridge.yaml`)

The OTEL collector writes to `clickhouse.platform-system.svc.cluster.local`
(the same instance the dashboard reads via `CLICKHOUSE_URL=http://localhost:8123`).
Locally that name must resolve to the docker-compose container on the host. The
bridge is a selectorless `Service` plus a manually managed `Endpoints` object
pointing at the k3s node's default gateway.

Find/verify the gateway IP:

```bash
docker exec staggers-k3s ip route | awk '/^default/ {print $3}'
# -> 192.168.97.1
```

Update `k8s/local/00-clickhouse-bridge.yaml` if it changes.

> Do **not** apply `k8s/data-stores/02-clickhouse.yaml` at the same time: it
> defines a `clickhouse` Service in the same namespace, backed by an in-cluster
> StatefulSet that the host dashboard cannot reach. Use the bridge for local dev,
> or the data-store for a self-contained in-cluster stack.

### Node capacity / replicas

The k3s node is CPU-constrained. Each sGTM pod requests 1 CPU. A site with
`desiredReplicas: 3` plus the egress and collector replicas can exhaust the node
(`0/1 nodes are available: 1 Insufficient cpu`), leaving pods `Pending`.

For local dev, keep sites small:

```bash
kubectl -n customer-workloads scale deploy/<sgtm-deployment> --replicas=1
# or update desired_replicas/min_replicas/max_replicas for the site in Postgres
```

You can also lower requests/limits in the generated per-site egress manifests
(`buildEgressManifests` in `packages/kubernetes/src/egress.ts`) and
`k8s/observability/08-otel-collector-deployment.yaml` for the local cluster.

### Reaching a site

There is no DNS locally. Use the Gateway's ClusterIP with a `Host` header, or
port-forward the gateway and resolve the site hostname manually:

```bash
kubectl -n edge-system get svc
# port-forward the Envoy service, then:
curl -H 'Host: metrics.rierink.dev' http://localhost:<port>/
```

---

## 5. Observability

`k8s/observability/07-otel-collector.yaml` reads ClickHouse connection settings
from environment variables so the same config works in-cluster and locally:

- `CLICKHOUSE_ENDPOINT`
- `CLICKHOUSE_USERNAME`
- `CLICKHOUSE_PASSWORD` (from the `clickhouse-credentials` secret)
- `CLICKHOUSE_DATABASE`

The collector creates `otel_traces`, `otel_logs` and `otel_metrics` on first
export (`create_schema: true`). The dashboard's derived tables
(`downstream_requests`, `site_health_hourly`) are created lazily by
`packages/clickhouse`; they start empty. Populate `downstream_requests` from
`otel_traces` with a materialized view before the analytics charts show data.

Verify:

```bash
kubectl -n platform-system get pods
curl -s "http://localhost:8123/?user=default&password=clickhouse&query=SHOW%20TABLES%20FROM%20otel"
```

---

## 6. Control plane processes

```bash
pnpm install
pnpm build          # apps typecheck against packages/*/dist
pnpm dev:apps       # dashboard + api + reconciler + worker
```

The reconciler and worker load `KUBECONFIG` once at startup. After recreating the
k3s cluster you must restart them, otherwise they keep using the old cluster's CA
and fail to talk to the API server. If they run under `tsx watch` and the child
process exits, the watcher may not respawn it — restart the process directly.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `invalid bearer token, service account token has expired` | host sleep / clock jump | `docker compose restart k3s-server` |
| `self-signed certificate in certificate chain` from reconciler/worker | stale kubeconfig after cluster recreate | restart reconciler/worker |
| `Failed to get system UUID` | no `/etc/machine-id` in container | machine-id bind mount (§1) |
| Egress Envoy `CrashLoopBackOff`, `could not find @type ...OpenTelemetryConfig` | wrong tracer type URL | use `envoy.config.trace.v3.OpenTelemetryConfig` |
| Egress Envoy `CrashLoopBackOff`, `no such field: 'cluster_type'` | nested `cluster_type` in the DFP cluster | use `cluster_type.name` |
| Egress Envoy `CrashLoopBackOff`, `%REQ(...)?%` | malformed access-log operator | use `%REQ(HEADER)%`, no `?` |
| HTTPS through the proxy fails with `404`/`503` | CONNECT not terminated | add `connect_matcher` route + `connect_config` (§8) |
| Gateway `EnvoyProxy` rejected: unknown field `parametersRef.namespace` | Envoy Gateway v1.1.0 schema | drop `namespace` |
| Gateway `EnvoyProxy` rejected: `accessLog.settings[0].sinks: Required value` | v1.1.0 requires sinks | add a `File` sink |
| pods `Pending`, `Insufficient cpu` | node overloaded | reduce site replicas / requests |
| `no route to host` to a pod IP | node just recovered from sleep | wait for kubelet/PLEG to recover |

---

## 8. Fixes applied

The following latent bugs were fixed so the data plane starts and HTTPS proxying
works. They were all found by applying the manifests to a fresh cluster and
reading the resulting Envoy/kubelet errors.

### Egress Envoy config (`packages/kubernetes/src/egress.ts`)

1. **No admin listener.** The deployment's liveness/readiness probes hit
   `/ready` on port `9901`, but no admin block was configured, so Envoy never
   bound the port and the pod was killed in a loop. Added an `admin` listener on
   `0.0.0.0:9901`.

2. **HTTPS CONNECT not supported.** sGTM sets `HTTPS_PROXY` to the egress proxy,
   so HTTPS requests arrive as `CONNECT host:443`. Envoy rejects CONNECT unless
   the upgrade is configured, and with only a `prefix: "/"` route the tunnel
   failed (403/404). Fixed with:
   - a route `match: { connect_matcher: {} }` with
     `upgrade_configs: [{ upgrade_type: CONNECT, connect_config: {} }]` so Envoy
     terminates the tunnel and forwards the raw TLS payload;
   - an HCM-level `upgrade_configs: [{ upgrade_type: CONNECT }]`.

   The destination allowlist Lua filter still runs before forwarding and returns
   `403` for non-allowlisted hosts.

3. **Wrong cluster field.** The DFP cluster used
   `cluster_type: { cluster_type: ..., typed_config: ... }`. The correct field is
   `cluster_type.name`.

4. **Wrong tracer type URL.** `envoy.extensions.tracers.opentelemetry.v3.OpenTelemetryConfig`
   (and `envoy.tracers...`) are not registered in `envoyproxy/envoy:v1.31-latest`.
   The working type URL is `envoy.config.trace.v3.OpenTelemetryConfig`.

5. **Malformed access-log operator.** `"%REQ(x-sgtm-site-id)?%"` is invalid; the
   `?` fallback syntax only applies inside the parentheses
   (`%REQ(X-HEADER?:pseudo)%`). Changed to `%REQ(X-SGTM-SITE-ID)%`.

6. **gRPC upstream protocol options.** The OTLP cluster used
   `upstream_protocol_options.explicit_http_config`; the modern
   `HttpProtocolOptions` message takes `explicit_http_config` directly.

### `k8s/envoy-ingress/01-gateway.yaml`

7. **`parametersRef.namespace` is invalid** for `spec.infrastructure` in
   Gateway API v1.1. The referenced `EnvoyProxy` must live in the Gateway's
   namespace (`edge-system`); the field was removed.

8. **`accessLog.settings[].sinks` is required** in Envoy Gateway v1.1 when a
   format is set. Added a `File` sink writing to `/dev/stdout`.

### `k8s/observability/07-otel-collector.yaml` and `08-...-deployment.yaml`

9. **Hard-coded, unreachable ClickHouse endpoint.** The exporter pointed at
   `clickhouse.platform-system.svc.cluster.local:9000` with no credentials and
   nothing created that Service. The connection is now injected via environment
   variables, credentials come from the `clickhouse-credentials` secret, and
   `k8s/local/00-clickhouse-bridge.yaml` maps the name to the docker-compose
   instance.

### `docker-compose.yml`

10. **k3s container lost its identity across restarts.** Added
    `restart: unless-stopped` and a persistent `/etc/machine-id`, which also
    silences the kubelet UUID warning.

---

## 9. Verification

```bash
export KUBECONFIG="$PWD/.kubeconfig/kubeconfig.yaml"

kubectl get nodes
kubectl get pods -n platform-system    # otel-collector Running
kubectl get pods -n edge-system        # Envoy proxy Running
kubectl get pods -n customer-workloads # one sgtm pod and one <site>-egress pod per site
kubectl get httproute -A

# HTTPS through a site's egress proxy (allowlisted host -> 200, other -> 403)
kubectl run curl --rm -it --restart=Never -n customer-workloads \
  --image=curlimages/curl --command -- \
  sh -c 'curl -s -o /dev/null -w "%{http_code}\n" \
    -x http://sgtm-site-example-egress.customer-workloads.svc.cluster.local:8080 \
    https://www.googletagmanager.com/static/serverjs/server_bootstrap.js'

# sGTM should log "Your tagging server is running"
kubectl logs -n customer-workloads -l app.kubernetes.io/name=sgtm --tail=5
```
