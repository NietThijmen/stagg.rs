# @staggers/db

Prisma client and PostgreSQL access layer for Stagg.rs.

## What it does

- Exports a singleton `PrismaClient` instance (`prisma`) reused across the monorepo in development.
- Provides `createPrismaClient(url?)` for creating isolated clients (e.g., tests or multiple databases).
- Re-exports generated Prisma types and enums from `@prisma/client`.
- Owns the `prisma/schema.prisma` source of truth for the platform data model.

## Entry points

- `src/index.ts` — singleton Prisma client and factory.
- `prisma/schema.prisma` — database schema.

## Scripts

```bash
pnpm build                # generate Prisma client and compile TypeScript
pnpm generate             # generate Prisma client only
pnpm migrate              # run prisma migrate dev with root .env
pnpm migrate:deploy       # run prisma migrate deploy
pnpm studio               # open Prisma Studio
pnpm lint                 # typecheck
```

## Usage

```typescript
import { prisma } from '@staggers/db';

const sites = await prisma.site.findMany();
```

## Environment variables

- `DATABASE_URL`

## Notes

- `prisma/migrations/` is gitignored. Be deliberate when changing `schema.prisma` because migrations are not tracked.
- The build script runs `prisma generate` so consumers always get updated types after schema changes.
