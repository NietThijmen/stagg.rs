import { createAnalyticsService } from '@staggers/analytics';
import { loadConfig, type AppConfig } from '@staggers/config';
import { prisma } from '@staggers/db';
import { WorkOS } from '@workos-inc/node';
import { createAuthenticator } from './lib/auth.js';
import type { AppDeps } from './types.js';

export function createDeps(config: AppConfig = loadConfig()): AppDeps {
  const { apiKey, clientId } = config.workos;

  if (!apiKey) {
    throw new Error('WORKOS_API_KEY is required to run the API');
  }
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID is required to verify AuthKit tokens');
  }

  const workos = new WorkOS(apiKey);

  return {
    config,
    prisma,
    workos,
    analytics: createAnalyticsService(config.clickhouse),
    authenticate: createAuthenticator({ workos, clientId }),
  };
}
