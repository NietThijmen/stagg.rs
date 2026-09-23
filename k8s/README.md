# Data plane

This directory contains the Kubernetes manifests for the Staggers sGTM platform data plane.

## Architecture

```text
Website / Client
    │
    ▼
Envoy Gateway (edge-system) — TLS termination, host routing, OTEL traces
    │
    ▼
Per-site sGTM Deployment (customer-workloads-<site-id>)
    │
    ▼
Per-site Egress Proxy (same namespace) — allowlisted forward proxy
    │
    ▼
Downstream destinations (Google Analytics, Ads, etc.)
```

Telemetry flows through the OpenTelemetry Collector to ClickHouse.

## Prerequisites

1. A Kubernetes cluster (v1.28+ recommended).
2. [Envoy Gateway](https://gateway.envoyproxy.io/docs/install/) installed.
3. [Gateway API](https://gateway-api.sigs.k8s.io/guides/) CRDs installed.
4. [cert-manager](https://cert-manager.io/docs/installation/) installed (for the wildcard TLS certificate).
5. A DNS provider token for [ExternalDNS](https://kubernetes-sigs.github.io/external-dns/) (records for site hostnames).
6. A ClickHouse instance reachable from the cluster (not included here).

## Deploy

```bash
kubectl apply -k k8s/
```

Or apply per component:

```bash
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/envoy-ingress/
kubectl apply -f k8s/cert-manager/
kubectl apply -f k8s/dns/
kubectl apply -f k8s/observability/
```

For the optional in-cluster databases:

```bash
kubectl apply -f k8s/data-stores/
```

## TLS and DNS automation

- `cert-manager/09-cert-manager.yaml` defines a Let's Encrypt `ClusterIssuer`
  (DNS-01) and a wildcard `Certificate` for `*.saas.example`, written to the
  `public-gateway-tls` secret the gateway listener uses.
- `dns/10-external-dns.yaml` runs ExternalDNS with the `gateway-httproute`
  source, so every per-site `HTTPRoute` the reconciler creates gets a matching
  DNS record automatically.
- Replace the placeholder Cloudflare tokens and the ACME email before applying.
  Custom site hostnames outside the platform domain need their own DNS zone
  filter and, for TLS, a matching gateway listener/certificate.

## Per-site sGTM deployment

`k8s/sgtm/03-example-deployment.yaml` is a template. The control plane will generate one per website with:

- A dedicated namespace `<K8S_NAMESPACE>-<site-id>` (e.g. `customer-workloads-<uuid>`) owning all of that site's resources.
- A unique Kubernetes `Deployment`, `Service`, `ServiceAccount`, `HPA`, and `NetworkPolicy`.
- A `Secret` containing the GTM `CONTAINER_CONFIG`.
- An `HTTPRoute` exposing the site on its custom hostname.
- `HTTP_PROXY` / `HTTPS_PROXY` pointing at its own egress proxy (`<site>-egress`).

## Egress proxy

Each site gets its own Envoy HTTP/HTTPS forward proxy in the same per-site
namespace, with:

- Destination allowlist enforced via Lua (`DEFAULT_EGRESS_HOSTS` plus that
  site's enabled `downstream_destinations`).
- OpenTelemetry access logging and tracing with `saas.site_id` baked into the
  Envoy config, so egress telemetry is attributed per customer deployment.
- Dynamic forward proxy for arbitrary allowed hosts.

The reconciler renders the per-site `ConfigMap`, `Deployment`, `Service` and
`NetworkPolicy` (`buildEgressManifests` in `packages/kubernetes`). To add a
customer-specific destination, use the dashboard's website page; the worker
re-applies that site's egress config and the `staggers.io/egress-config-hash`
annotation rolls the proxy.

## Network isolation

- Each site lives in its own namespace (`<K8S_NAMESPACE>-<site-id>`), so tenants are isolated from each other.
- sGTM pods can only receive traffic from `edge-system`.
- sGTM pods can only send outbound traffic to their own egress proxy and the OTEL collector.
- Each site's egress proxy is the only workload for that site allowed unrestricted outbound access.

## Observability

The OTEL Collector receives:

- Envoy access logs and traces from ingress and egress.
- Traces from the Node.js control plane (when deployed).

It exports traces and logs to ClickHouse. The dashboard queries ClickHouse for:

- Request counts, latency percentiles and error rates (`downstream_requests`).
- Recent traces and per-span trace detail (`otel_traces`).

`downstream_requests` and `site_health_hourly` are product tables defined in
`packages/clickhouse/src/schema.ts`. Populate `downstream_requests` from
`otel_traces` with a materialized view (or your own pipeline) before the
analytics charts show data.

## Notes / TODO

- Replace `REPLACE_WITH_GTM_CONTAINER_CONFIG` and `REPLACE_ME` placeholders before applying the example.
- The example sGTM deployment uses a fake hostname (`metrics.example.com`) — the control plane will generate real ones.
- ClickHouse manifests are intentionally not included; use ClickHouse Cloud or a separate chart for production.
- Envoy Gateway access-log attributes and dynamic header injection are still evolving; verify against your installed version.
