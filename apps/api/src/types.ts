import type { AnalyticsService } from '@staggers/analytics';
import type { AppConfig } from '@staggers/config';
import type { PrismaClient } from '@staggers/db';
import type { WorkOS } from '@workos-inc/node';
import type { Principal } from './lib/auth.js';

export interface AppDeps {
  config: AppConfig;
  prisma: PrismaClient;
  workos: WorkOS;
  analytics: AnalyticsService;
  authenticate: (token: string) => Promise<Principal | null>;
}

export interface AppEnv {
  Variables: {
    deps: AppDeps;
    principal: Principal;
  };
}
