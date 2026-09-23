# @staggers/api

Public REST API for Stagg.rs, built with Hono and documented with OpenAPI 3.1.

## What it does

- Exposes `/v1` endpoints for organizations, sites, destinations, jobs, analytics, tokens, and the current caller.
- Authenticates callers via a WorkOS API key or a WorkOS AuthKit access token in the `Authorization: Bearer <token>` header.
- Serves the OpenAPI spec at `/openapi.json` and interactive docs at `/docs`.
- Authorizes requests using scopes derived from the principal (API key permissions or WorkOS user role).

## Tech stack

- Hono 4 + `@hono/zod-openapi`
- `@scalar/hono-api-reference` for docs
- `@workos-inc/node` + `jose` for auth
- `@staggers/db`, `@staggers/contracts`, `@staggers/analytics`, `@staggers/config`, `@staggers/telemetry`

## Entry points

- `src/index.ts` — loads config, initializes telemetry, and starts the Node server.
- `src/app.ts` — assembles the Hono app, registers middleware, routers, OpenAPI docs, and error handling.
- `src/deps.ts` — creates the runtime dependency object (Prisma, WorkOS client, analytics service, etc.).
- `src/routes/*.ts` — route modules mounted under `/v1`.
- `src/lib/` — auth, access control, serializers, scopes, errors, WorkOS sync, and middleware.
- `src/generate-openapi.ts` — writes the OpenAPI document to `apps/api/openapi.json`.

## Scripts

```bash
pnpm dev                  # run with hot reload, loading root .env
pnpm start                # run compiled dist/index.js
pnpm build                # compile TypeScript
pnpm lint                 # typecheck
pnpm openapi              # regenerate apps/api/openapi.json
```

## Environment variables

- `API_PORT` — server port (default `4000`)
- `DATABASE_URL`
- `CLICKHOUSE_URL`, `CLICKHOUSE_USERNAME`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE`
- `WORKOS_CLIENT_ID` — used to verify AuthKit access tokens
- `WORKOS_API_KEY` — used to validate organization API keys and sync org data
- `OTEL_ENDPOINT`, `OTEL_SERVICE_NAME`

## Authentication

Send a bearer token:

```bash
curl -H "Authorization: Bearer $STAGGERS_API_TOKEN" http://localhost:4000/v1/sites
```

- WorkOS API keys are validated via `workos.apiKeys.createValidation`.
- AuthKit access tokens are verified against the JWKS from `workos.userManagement.getJwksUrl`.

## Notes

- Route definitions must not touch `deps` at module load because `generate-openapi.ts` builds the app with a dummy dependency object.
- The committed `openapi.json` is regenerated with `pnpm openapi`.
