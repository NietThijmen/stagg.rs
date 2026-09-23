# @staggers/worker

Provisioning job runner for Stagg.rs.

## What it does

- Polls Postgres for pending `provisioning_jobs` rows.
- Handles `provision_site` jobs by storing the site's container config in a Kubernetes Secret and setting the site status to `pending` for the reconciler.
- Handles `sync_egress_config` jobs by re-applying a site's per-site egress
  ConfigMap/Deployment with default hosts plus that site's enabled downstream
  destinations (the config hash annotation rolls the proxy).
- Updates job status to `in_progress`, `completed`, or `failed` with error details.

## Tech stack

- Node.js/TypeScript ESM
- `@staggers/kubernetes` for Secret creation and egress sync
- `@staggers/db` for jobs and site persistence
- `@staggers/config` and `@staggers/telemetry`

## Entry points

- `src/index.ts` — main job polling loop and handlers.

## Scripts

```bash
pnpm dev                  # run with hot reload, loading root .env
pnpm start                # run compiled dist/index.js
pnpm build                # compile TypeScript
pnpm lint                 # typecheck
```

## Environment variables

- `KUBECONFIG` — path to kubeconfig file; omit to use in-cluster config
- `K8S_NAMESPACE` — namespace for site Secrets and egress resources (default `customer-workloads`)
- `DATABASE_URL`
- `OTEL_ENDPOINT`, `OTEL_SERVICE_NAME`

## Job types

| Type                | Description                                                                 |
|---------------------|------------------------------------------------------------------------------|
| `provision_site`    | Writes the site's `containerConfig` to a Secret named `{resourceName}-config`. |
| `sync_egress_config` | Re-applies the site's per-site egress ConfigMap/Deployment from its destinations. |

## Notes

- The worker owns the container-config Secret; the reconciler only references it.
- Egress sync preserves the `BEGIN MANAGED DESTINATIONS` / `END MANAGED DESTINATIONS` markers in the rendered Envoy config.
