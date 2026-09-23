# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` is a
symlink to this file.

## What this is

**Stagg.rs** is a server-side Google Tag Manager (sGTM) hosting platform. It
provisions and runs one sGTM container per customer site on Kubernetes, fronts
them with Envoy Gateway, routes outbound traffic through an allowlisting egress
proxy, and surfaces request analytics/traces from ClickHouse in a SvelteKit
dashboard. It is a work-in-progress proof-of-concept, not production-ready.

## Architecture

```text
SvelteKit dashboard (WorkOS auth, sites, analytics, destinations)
        │
Control plane (Node.js/TypeScript)
  reconciler  – renders + applies per-site Kubernetes manifests
  worker      – container-config provisioning jobs, egress allowlist sync
  config/db   – shared packages
        │
Data plane (Kubernetes)
  Envoy ingress → per-site sGTM → Envoy egress proxy → Google/downstream
        │
Observability (ClickHouse via OTel Collector)
```

## Monorepo layout

```text
apps/
  dashboard/    SvelteKit frontend + BFF (server routes/actions)
  api/          Public REST API (Hono + zod-openapi), WorkOS bearer auth
  cli/          `staggers` CLI that talks to the API
  reconciler/   Desired-state reconciler (site manifests)
  worker/       Provisioning job runner (container config, egress)
packages/
  contracts/    Shared Zod schemas/types
  config/       Env config validation (Zod)
  db/           Prisma client + PostgreSQL
  analytics/    ClickHouse analytics query service
  clickhouse/   ClickHouse client + derived table schemas
  kubernetes/   Manifest builders, server-side apply, egress sync
  telemetry/    OpenTelemetry SDK setup
k8s/            Cluster manifests (namespaces, ingress, cert-manager, dns,
                sgtm example, egress, observability, data-stores)
```

## Commands

```bash
pnpm install                 # install all workspaces
pnpm build                   # build every workspace (tsc / svelte-kit)
pnpm lint                    # typecheck every workspace (tsc --noEmit / svelte-check)
pnpm test                    # Vitest unit tests
pnpm test:watch
pnpm dev                     # run all workspace dev tasks
pnpm dev:apps                # run dashboard + api + reconciler + worker concurrently
pnpm --filter @staggers/dashboard dev   # or api / cli / reconciler / worker
pnpm api:dev                 # public API with reload
pnpm cli:dev -- whoami       # run the CLI from source
pnpm openapi                 # regenerate apps/api/openapi.json
pnpm db:generate             # prisma generate
pnpm db:migrate              # prisma migrate dev (needs DATABASE_URL)
pnpm db:studio
```

Local infrastructure: `docker compose up -d` (Postgres on 5433, ClickHouse on
8123/9000, k3s). k3s writes a kubeconfig to `./.kubeconfig/kubeconfig.yaml`
pointing the reconciler at the local cluster. The dashboard loads env from the
repo-root `.env` via SvelteKit; the Node apps pass `--env-file=../../.env` to
`tsx` in their `dev` scripts so `pnpm dev:apps` picks up the same values.

## Conventions

- TypeScript, ESM, `NodeNext` resolution. **Relative imports use `.js`
  extensions** (e.g. `import { x } from './foo.js'`).
- Conventional Commits (`feat(scope): …`, `fix(scope): …`, `test: …`, `ci: …`).
- Do not add code comments unless they carry real information; the codebase is
  lightly commented and prefers self-explanatory names.
- Shared types/validation live in `@staggers/contracts` and `@staggers/config`.
- Zod is used for env/input validation.
- Tests are colocated as `src/*.test.ts` and excluded from package `tsconfig`
  builds.

## Key wiring

### Provisioning flow

1. Dashboard creates a `Site` (with the user-supplied `containerConfig`) + a
   `provisioning_jobs` row (`provision_site`).
2. Worker (`apps/worker/src/index.ts`) handles job types:
   - `provision_site` – writes the site's `containerConfig` to the
     `${siteResourceName(id)}-config` Secret, sets `containerConfigSecretName`,
     and sets site status to `pending`.
   - `sync_egress_config` – rewrites the egress allowlist and rolls egress.
3. Reconciler (`apps/reconciler/src/index.ts`) polls sites in
   `pending|provisioning|degraded|deleting`, renders manifests
   (`buildSiteManifests`), applies them, and records readiness.

### Kubernetes manifests

- `packages/kubernetes/src/manifests.ts` renders Secret (only when a raw
  `containerConfig` is passed), ServiceAccount, Service, Deployment, HPA,
  HTTPRoute, NetworkPolicy, ResourceQuota and LimitRange per site.
- `apply.ts` uses **server-side apply** via `KubernetesObjectApi` with the
  shared field manager `staggers-platform`. `deleteManifests` ignores 404s.
- The container-config Secret is owned by the **worker**, not the reconciler;
  the reconciler only references it and deletes it on site teardown via
  `containerConfigSecretRef`.

### Egress allowlist

- `k8s/egress/05-egress-config.yaml` contains markers
  `-- BEGIN MANAGED DESTINATIONS` / `-- END MANAGED DESTINATIONS`.
- `packages/kubernetes/src/egress.ts` replaces everything between the markers
  with `DEFAULT_EGRESS_HOSTS` plus enabled `downstream_destinations` rows, then
  rolls the `egress-envoy` Deployment. **Never remove the markers.**

### Dashboard auth

- WorkOS AuthKit handles sign-in (`apps/dashboard/src/hooks.server.ts`).
- `apps/dashboard/src/lib/server/authz.ts` is the authorization layer:
  `requireAuthz`, `requireOrganizationAccess`, `requireSiteAccess`,
  `organizationIds`. It syncs WorkOS memberships into Postgres (60s TTL) and
  scopes sites/orgs to the caller. Use these helpers in server routes/actions;
  never trust a raw `siteId`/`organizationId` from the client.
- Org admin roles: `organization_owner`, `organization_admin`.

### Public API and CLI

- `apps/api` is a standalone Hono service (`createApp` in `src/app.ts`) on
  `API_PORT` (default 4000). It uses `@hono/zod-openapi`; the spec is served at
  `/openapi.json`, Scalar docs at `/docs`, and committed to `apps/api/openapi.json`
  (regenerate with `pnpm openapi`). `src/generate-openapi.ts` builds the app with
  a dummy deps object, so route definitions must not touch `deps` at module load.
- Auth (`src/lib/auth.ts`) accepts **both** an organization-owned WorkOS API key
  (validated via `workos.apiKeys.createValidation`) and a WorkOS AuthKit access
  token (verified against the JWKS from `workos.userManagement.getJwksUrl`). The
  resulting `Principal` carries organization ids, role/permissions and resolved
  `scopes` (`src/lib/scopes.ts`). API keys with no permissions get all scopes;
  users get read-only scopes unless they hold an admin role.
- Routes under `/v1` (sites, destinations, jobs, analytics, organizations,
  tokens, `me`) authorize via `src/lib/access.ts` (`requireScope`,
  `requireSiteAccess`, `requireOrganizationAccess`). Organizations are synced
  from WorkOS on demand (`src/lib/workos-sync.ts`).
- `apps/cli` is the `staggers` CLI (commander). It resolves the token from
  `--token` → `STAGGERS_API_TOKEN` → `~/.config/staggers/config.json`, and the
  base URL from `--api-url` → `STAGGERS_API_URL` → config → `http://localhost:4000`.

### Analytics

- `packages/analytics` owns the ClickHouse queries (`createAnalyticsService`):
  `downstream_requests` for timeseries/summary/recent traces, `otel_traces` for
  trace detail. `apps/dashboard/src/lib/server/analytics.ts` and the API both
  consume it.
- `packages/clickhouse/src/schema.ts` defines the derived product tables
  (`downstream_requests`, `site_health_hourly`). `createAnalyticsService` runs
  `initializeDerivedTables` lazily on first query (idempotent, one statement at
  a time — ClickHouse's HTTP interface rejects multi-statement requests), so the
  dashboard/API create the tables automatically. Populate `downstream_requests`
  from `otel_traces` (e.g. a materialized view) for charts to show data.

## Environment

See `.env.example`. Notable variables:

- `DATABASE_URL`, `CLICKHOUSE_*`
- `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`,
  `WORKOS_COOKIE_PASSWORD`
- `KUBECONFIG`, `K8S_NAMESPACE` (default `customer-workloads`),
  `K8S_EDGE_NAMESPACE` (default `edge-system`)
- `PLATFORM_DOMAIN` (default `saas.example`), `SGTM_IMAGE`
- `API_PORT` (default `4000`, used by `apps/api`)
- `STAGGERS_API_URL`, `STAGGERS_API_TOKEN` (used by `apps/cli`)
- `OTEL_ENDPOINT`, `OTEL_SERVICE_NAME`

## Gotchas

- **Build before lint.** Apps typecheck against `@staggers/*` declarations in
  `dist/`, so run `pnpm build` before `pnpm lint` in a clean checkout. CI does
  this.
- **Dashboard build needs env.** SvelteKit's post-build analysis instantiates
  the WorkOS client, so the build requires placeholder `WORKOS_*`,
  `DATABASE_URL` and `CLICKHOUSE_URL` values (CI sets dummies). Runtime uses the
  real values.
- **pnpm build approvals.** `pnpm-workspace.yaml` `allowBuilds` must keep
  `@prisma/client`, `@prisma/engines`, `esbuild`, `prisma` and `protobufjs` set
  to `true`, otherwise non-interactive `pnpm install` fails with
  `ERR_PNPM_IGNORED_BUILDS`.
- **Prisma migrations are gitignored** (`prisma/migrations/`). Be deliberate
  when changing `packages/db/prisma/schema.prisma`; migrations are not tracked.
- **Container config is user-supplied.** Sites are created with a raw GTM server
  container config; there is no GTM API/service-account integration yet (a
  future contribution is expected to wire this through WorkOS pipes).
- The example `k8s/sgtm/03-example-deployment.yaml` is a template; the
  reconciler generates real per-site manifests.
- `k8s/` requires external controllers (Envoy Gateway, Gateway API CRDs,
  cert-manager) and placeholder tokens (Cloudflare) to be replaced.

## CI

`.github/workflows/ci.yml` runs a single job on pushes to `main` and PRs:
`pnpm install --frozen-lockfile` → `pnpm build` → `pnpm lint` → `pnpm test`,
using pnpm 11 and Node 22.
