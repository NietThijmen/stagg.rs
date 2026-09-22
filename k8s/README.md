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
4. A ClickHouse instance reachable from the cluster (not included here).
5. A TLS certificate for your ingress domain (see `envoy-ingress/02-tls-and-health.yaml`).

## Deploy

```bash
kubectl apply -k k8s/
```

Or apply per component:

```bash
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/envoy-ingress/
kubectl apply -f k8s/egress/
kubectl apply -f k8s/observability/
```

For the optional in-cluster databases:

```bash
kubectl apply -f k8s/data-stores/
```

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

To add a customer-specific destination, update the `allowed` table in `k8s/egress/05-egress-config.yaml` (or generate it from the control plane).

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
