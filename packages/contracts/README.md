# @staggers/contracts

Shared Zod schemas and TypeScript types used across the Stagg.rs monorepo.

## What it contains

- `identity.ts` — identity, membership, and role types.
- `site.ts` — site, site status, and container-config related schemas.
- `deployment.ts` — deployment and job contract types.

## Usage

```typescript
import { SiteStatus, type Site } from '@staggers/contracts';
```

## Scripts

```bash
pnpm build                # compile TypeScript declarations
pnpm dev                  # compile in watch mode
pnpm lint                 # typecheck
```

## Notes

- This package has no runtime dependencies other than `zod`.
- Keep schemas source-of-truth for data shared between the API, dashboard, worker, and reconciler.
