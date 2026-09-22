# Stagg.rs

Server-side Google Tag Manager hosting platform.

> **Note:** This is a work-in-progress. and is mostly a proof-of-concept if it's cheaper to self-host this than use Google's services.
> We're not affiliated with Google or tagg.rs in any way.

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
  gtm/              Google Tag Manager API client
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

### 3. Start infrastructure

The included `docker-compose.yml` starts PostgreSQL, ClickHouse, and a local k3s Kubernetes controller:

```bash
docker compose up -d
```

Wait for k3s to write its kubeconfig:

```bash
until [ -f .kubeconfig/kubeconfig.yaml ]; do sleep 1; done
```

Then update `.env` to point at the generated kubeconfig:

```bash
# .env
KUBECONFIG=/absolute/path/to/.kubeconfig/kubeconfig.yaml
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

### 7. Stop infrastructure

```bash
docker compose down
```

To wipe data volumes:

```bash
docker compose down -v
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

- [x] Implement Kubernetes manifest generation in the reconciler.
- [x] Integrate Google Tag Manager API for container creation.
- [x] Wire WorkOS organization membership to site authorization.
- [ ] Add certificate management (cert-manager) and DNS automation.
- [ ] Add egress destination management UI/API.
- [ ] Add real analytics charts and trace detail pages.
- [ ] Add tests.
