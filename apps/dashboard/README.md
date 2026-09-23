# @staggers/dashboard

SvelteKit frontend and backend-for-frontend (BFF) for Stagg.rs.

## What it does

- Authenticates users via WorkOS AuthKit.
- Lists organizations and sites the signed-in user has access to.
- Provides forms to create organizations, sites, and downstream destinations.
- Renders analytics charts and trace detail pages by querying ClickHouse through the server-side analytics service.
- Acts as a BFF: all data fetching and authorization run in SvelteKit server routes/actions, never in the browser.

## Tech stack

- SvelteKit 2 + Svelte 5
- Tailwind CSS 4 + shadcn-svelte + bits-ui
- Vite
- `@workos/authkit-sveltekit` for authentication
- `@staggers/db`, `@staggers/analytics`, `@staggers/contracts`, `@staggers/config`

## Entry points

- `src/hooks.server.ts` — configures AuthKit and attaches the auth handle.
- `src/lib/server/authz.ts` — authorization helpers (`requireAuthz`, `requireOrganizationAccess`, `requireSiteAccess`). Syncs WorkOS memberships into Postgres with a 60-second TTL.
- `src/lib/server/analytics.ts` — server-side ClickHouse analytics service instance.
- `src/routes/` — SvelteKit pages and API routes.

## Scripts

```bash
pnpm dev                  # start the dev server
pnpm build                # production build
pnpm preview              # preview production build
pnpm check                # svelte-check typecheck
pnpm lint                 # svelte-check typecheck
```

## Environment variables

Loaded from the root `.env` via SvelteKit:

- `WORKOS_CLIENT_ID`
- `WORKOS_API_KEY`
- `WORKOS_REDIRECT_URI`
- `WORKOS_COOKIE_PASSWORD`
- `DATABASE_URL`
- `CLICKHOUSE_URL`
- `CLICKHOUSE_USERNAME`
- `CLICKHOUSE_PASSWORD`
- `CLICKHOUSE_DATABASE`

See `packages/config` for the full schema.

## Notes

- The build instantiates the WorkOS client, so placeholder env values are required in CI even though they are not used at runtime.
- All site/organization IDs from the client are validated through `authz.ts`; never trust raw IDs in server code.
