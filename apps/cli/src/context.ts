import { Command } from 'commander';
import { ApiClient } from './client.js';
import { DEFAULT_API_URL, readConfig } from './config.js';

export function addGlobalOptions(command: Command): Command {
  return command
    .option('--api-url <url>', 'API base URL (env: STAGGERS_API_URL)')
    .option(
      '--token <token>',
      'WorkOS API key or AuthKit access token (env: STAGGERS_API_TOKEN)',
    )
    .option('--json', 'Output raw JSON');
}

export interface CliContext {
  client: ApiClient;
  json: boolean;
}

export function resolveContext(command: Command): CliContext {
  const opts = command.optsWithGlobals() as {
    apiUrl?: string;
    token?: string;
    json?: boolean;
  };

  const config = readConfig();
  const apiUrl =
    opts.apiUrl ?? process.env.STAGGERS_API_URL ?? config.apiUrl ?? DEFAULT_API_URL;
  const token = opts.token ?? process.env.STAGGERS_API_TOKEN ?? config.token;

  if (!token) {
    throw new Error(
      'No API token. Pass --token, set STAGGERS_API_TOKEN, or run `staggers config set --token <token>`.',
    );
  }

  return {
    client: new ApiClient({ apiUrl, token }),
    json: Boolean(opts.json),
  };
}
