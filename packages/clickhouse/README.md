# @staggers/clickhouse

ClickHouse client wrapper and derived table schemas for Stagg.rs.

## What it does

- Exports `createClickHouseClient(config)` as a thin wrapper around `@clickhouse/client`.
- Defines the derived product tables used by analytics in `src/schema.ts`:
  - `downstream_requests` — aggregated downstream request metrics per site.
  - `site_health_hourly` — hourly site health rollups.
- Provides `initializeDerivedTables(client)` to create tables idempotently.

## Exports

- `@staggers/clickhouse` — client factory and re-exports from `@clickhouse/client`.
- `@staggers/clickhouse/schema` — schema definitions and initialization helper.

## Usage

```typescript
import { createClickHouseClient } from '@staggers/clickhouse';
import { initializeDerivedTables } from '@staggers/clickhouse/schema';

const client = createClickHouseClient({
  url: 'http://localhost:8123',
  username: 'default',
  password: '',
  database: 'otel',
});

await initializeDerivedTables(client);
```

## Scripts

```bash
pnpm build                # compile TypeScript
pnpm dev                  # compile in watch mode
pnpm lint                 # typecheck
```

## Notes

- ClickHouse's HTTP interface rejects multi-statement requests, so `initializeDerivedTables` runs one DDL statement at a time.
