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
Per-site sGTM Deployment (customer-workloads)
    │
    ▼
Envoy Egress Proxy (edge-system) — allowlisted forward proxy
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
kubectl apply -f k8s/egress/
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

- A unique Kubernetes `Deployment`, `Service`, `ServiceAccount`, `HPA`, and `NetworkPolicy`.
- A `Secret` containing the GTM `CONTAINER_CONFIG`.
- An `HTTPRoute` exposing the site on its custom hostname.
- `HTTP_PROXY` / `HTTPS_PROXY` pointing to `egress-envoy.edge-system:8080`.

## Egress proxy

`egress-envoy` is an HTTP/HTTPS forward proxy with:

- Destination allowlist enforced via Lua.
- OpenTelemetry access logging and tracing.
- Dynamic forward proxy for arbitrary allowed hosts.

To add a customer-specific destination, use the dashboard's website page. The
worker regenerates the allowlist between the `BEGIN/END MANAGED DESTINATIONS`
markers in `k8s/egress/05-egress-config.yaml` from the `downstream_destinations`
table and rolls the egress deployment. You can still edit the file by hand for
platform-wide defaults.

## Network isolation

- sGTM pods can only receive traffic from `edge-system`.
- sGTM pods can only send outbound traffic to `egress-envoy` and the OTEL collector.
- Egress Envoy is the only workload allowed unrestricted outbound access.

## Observability

The OTEL Collector receives:

- Envoy access logs and traces from ingress and egress.
- Traces from the Node.js control plane (when deployed).

It exports traces and logs to ClickHouse. The dashboard will query ClickHouse for:

- Request counts, latency percentiles, error rates.
- Downstream destination status.
- Trace detail views.

## Notes / TODO

- Replace `REPLACE_WITH_GTM_CONTAINER_CONFIG` and `REPLACE_ME` placeholders before applying the example.
- The example sGTM deployment uses a fake hostname (`metrics.example.com`) — the control plane will generate real ones.
- ClickHouse manifests are intentionally not included; use ClickHouse Cloud or a separate chart for production.
- Envoy Gateway access-log attributes and dynamic header injection are still evolving; verify against your installed version.
