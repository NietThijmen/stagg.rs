# @staggers/analytics

ClickHouse analytics query service for Stagg.rs.

## What it does

- Provides a typed `AnalyticsService` for querying site analytics and traces.
- Bootstraps derived product tables (`downstream_requests`, `site_health_hourly`) on first query via `packages/clickhouse/schema`.
- Implements:
  - `getSiteAnalytics(siteId, from, to)` — timeseries and summary from `downstream_requests`.
  - `listRecentTraces(siteId, limit)` — recent trace summaries.
  - `getTrace(traceId)` — span detail from `otel_traces`.
  - `traceBelongsToSite(siteId, traceId)` — authorization helper.

## Tech stack

- `@staggers/clickhouse` for client and schema

## Usage

```typescript
import { createAnalyticsService } from '@staggers/analytics';

const service = createAnalyticsService({ url: 'http://localhost:8123' });
const analytics = await service.getSiteAnalytics(siteId, from, to);
```

## Scripts

```bash
pnpm build                # compile TypeScript
pnpm dev                  # compile in watch mode
pnpm lint                 # typecheck
```

## Notes

- Derived tables are created lazily and best-effort; a read-only ClickHouse user can still query existing tables.
- Populate `downstream_requests` from `otel_traces` (e.g., via a materialized view) for charts to show data.
