# @staggers/cli

Command line interface for the Stagg.rs public API.

## What it does

- Provides the `staggers` executable for managing organizations, sites, destinations, jobs, analytics, and API tokens.
- Reads configuration and credentials from flags, environment variables, or `~/.config/staggers/config.json`.
- Prints API responses in a human-readable format.

## Tech stack

- Commander.js
- Node.js/TypeScript ESM

## Entry points

- `src/index.ts` — bootstraps the `staggers` command tree and error handling.
- `src/context.ts` — resolves API URL and token from `--api-url`/`--token`, environment, or config file.
- `src/client.ts` — thin typed HTTP client for the Stagg.rs API.
- `src/commands/*.ts` — command modules for organizations, sites, destinations, jobs, analytics, tokens, and config.
- `src/config.ts` — reads and writes `~/.config/staggers/config.json`.
- `src/output.ts` — formatting helpers for CLI output.

## Scripts

```bash
pnpm dev -- <args>        # run from source with tsx
pnpm build                # compile TypeScript
pnpm start -- <args>      # run compiled dist/index.js
pnpm lint                 # typecheck
```

## Configuration resolution

The CLI resolves values in the following priority (first wins):

1. Command-line flags (`--token`, `--api-url`)
2. Environment variables (`STAGGERS_API_TOKEN`, `STAGGERS_API_URL`)
3. `~/.config/staggers/config.json`
4. Default API URL: `http://localhost:4000`

## Usage examples

```bash
# Build and run
pnpm build

# Show current caller
node apps/cli/dist/index.js whoami

# List sites
node apps/cli/dist/index.js sites list

# Create a site
node apps/cli/dist/index.js sites create \
  --organization org_... \
  --name "My site" \
  --hostname gtm.example.com \
  --container-config-file ./container-config.json

# Show analytics summary
node apps/cli/dist/index.js analytics summary <siteId>

# Manage config
node apps/cli/dist/index.js config set token sk_...
node apps/cli/dist/index.js config set api-url http://localhost:4000
```

Run `staggers --help` or `staggers <command> --help` for the full command tree.
