# @staggers/reconciler

Kubernetes desired-state reconciler for Stagg.rs sites.

## What it does

- Polls Postgres every 10 seconds for sites in `pending`, `provisioning`, `degraded`, or `deleting` status.
- Renders per-site Kubernetes manifests (Deployment, Service, HTTPRoute, NetworkPolicy, ResourceQuota, LimitRange, HPA, ServiceAccount).
- Applies manifests with server-side apply using the shared field manager `staggers-platform`.
- Waits for the Deployment to become ready and updates the site status to `ready` or `degraded`.
- Deletes manifests and the container-config Secret when a site is marked `deleting`, then removes the site from Postgres.
- Records the current deployment status in the `site_deployment` table.

## Tech stack

- Node.js/TypeScript ESM
- `@staggers/kubernetes` for manifest generation and cluster access
- `@staggers/db` for persistence
- `@staggers/config` and `@staggers/telemetry`

## Entry points

- `src/index.ts` — main reconcile loop.

## Scripts

```bash
pnpm dev                  # run with hot reload, loading root .env
pnpm start                # run compiled dist/index.js
pnpm build                # compile TypeScript
pnpm lint                 # typecheck
```

## Environment variables

- `KUBECONFIG` — path to kubeconfig file; omit to use in-cluster config
- `K8S_NAMESPACE` — namespace for site workloads (default `customer-workloads`)
- `K8S_EDGE_NAMESPACE` — namespace for Envoy Gateway / edge resources (default `edge-system`)
- `SGTM_IMAGE` — container image used for sGTM deployments
- `DATABASE_URL`
- `OTEL_ENDPOINT`, `OTEL_SERVICE_NAME`

## Notes

- The container-config Secret is owned by the worker; the reconciler only references it and deletes it during teardown.
- Manifests are applied idempotently via server-side apply.
