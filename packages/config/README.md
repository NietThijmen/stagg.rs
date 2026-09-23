# @staggers/config

Environment configuration validation for Stagg.rs applications.

## What it does

- Defines a single Zod schema (`appConfig`) for all shared environment variables.
- Parses `process.env` (or a provided record) into a typed `AppConfig` object.
- Provides sensible defaults for local development.

## Configuration groups

| Group        | Variables                                                                  |
|--------------|----------------------------------------------------------------------------|
| Node / HTTP  | `NODE_ENV`, `PORT`, `API_PORT`                                             |
| Database     | `DATABASE_URL`                                                             |
| ClickHouse   | `CLICKHOUSE_URL`, `CLICKHOUSE_USERNAME`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE` |
| Kubernetes   | `KUBECONFIG`, `K8S_NAMESPACE`, `K8S_EDGE_NAMESPACE`                        |
| Telemetry    | `OTEL_ENDPOINT`, `OTEL_SERVICE_NAME`                                       |
| WorkOS       | `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`                                       |
| Platform     | `PLATFORM_DOMAIN`, `SGTM_IMAGE`                                            |

## Usage

```typescript
import { loadConfig } from '@staggers/config';

const config = loadConfig();
console.log(config.apiPort);
```

## Scripts

```bash
pnpm build                # compile TypeScript
pnpm dev                  # compile in watch mode
pnpm lint                 # typecheck
```

## Notes

- Leave `KUBECONFIG` empty to use in-cluster Kubernetes config.
- Defaults are tuned for local development with `docker compose`.
