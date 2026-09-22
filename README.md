# Staggers

Server-side Google Tag Manager hosting platform.

## Architecture

```text
┌─────────────────────────────────────────┐
│              SvelteKit dashboard         │
│         (WorkOS auth, sites, analytics)  │
└─────────────────────────────────────────┘
                   │
┌──────────────────┼──────────────────────┐
│      Control plane (Node.js/TypeScript)  │
│  ┌─────────────┐ ┌──────────┐ ┌────────┐ │
│  │ reconciler  │ │ worker   │ │ config │ │
│  │ (Kubernetes)│ │ (jobs)   │ │        │ │
│  └─────────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────┘
                   │
┌──────────────────┼──────────────────────┐
│         Data plane (Kubernetes)          │
│  Envoy ingress → sGTM → Envoy egress →   │
│  Google Analytics / downstream           │
└─────────────────────────────────────────┘
                   │
┌──────────────────┼──────────────────────┐
│      Observability (ClickHouse)          │
│  OTEL traces/logs/metrics → analytics    │
└─────────────────────────────────────────┘
```

## Monorepo layout

```text
apps/
  dashboard/        SvelteKit frontend + BFF
  reconciler/       Kubernetes desired-state reconciler
  worker/           Provisioning and GTM API jobs
packages/
  contracts/        Shared Zod schemas and types
  config/           Environment config validation
  db/               Prisma ORM + PostgreSQL client
  clickhouse/       ClickHouse client + derived schemas
  kubernetes/       Kubernetes client helpers
  telemetry/        OpenTelemetry SDK setup
k8s/
  namespaces/       Cluster namespaces
  envoy-ingress/    Envoy Gateway manifests
  sgtm/             Example per-site sGTM manifests
  egress/           Envoy egress proxy
  observability/    OTEL Collector
  data-stores/      PostgreSQL + ClickHouse manifests
```

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start databases

For local development you can use the Kubernetes manifests or Docker:

```bash
docker run -d --name staggers-postgres \
  -e POSTGRES_PASSWORD=localdev \
  -p 5432:5432 postgres:17-alpine

docker run -d --name staggers-clickhouse \
  -e CLICKHOUSE_PASSWORD=localdev \
  -p 8123:8123 -p 9000:9000 \
  clickhouse/clickhouse-server:24.10-alpine
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Build packages

```bash
pnpm build
```

### 6. Run services

In separate terminals:

```bash
pnpm --filter @staggers/dashboard dev
pnpm --filter @staggers/reconciler dev
pnpm --filter @staggers/worker dev
```

## Deploying data plane

```bash
kubectl apply -k k8s/
```

For databases:

```bash
kubectl apply -f k8s/data-stores/
```

## Key TODOs before production

- [ ] Implement Kubernetes manifest generation in the reconciler.
- [ ] Integrate Google Tag Manager API for container creation.
- [ ] Wire WorkOS organization membership to site authorization.
- [ ] Add certificate management (cert-manager) and DNS automation.
- [ ] Add egress destination management UI/API.
- [ ] Add real analytics charts and trace detail pages.
- [ ] Add tests.
