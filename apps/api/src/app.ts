import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import type { AppDeps, AppEnv } from './types.js';
import { ApiError } from './lib/errors.js';
import { createAuthMiddleware } from './lib/middleware.js';
import { createAnalyticsRouter } from './routes/analytics.js';
import { createDestinationsRouter } from './routes/destinations.js';
import { createHealthRouter } from './routes/health.js';
import { createJobsRouter } from './routes/jobs.js';
import { createMeRouter } from './routes/me.js';
import { createOrganizationsRouter } from './routes/organizations.js';
import { createSitesRouter } from './routes/sites.js';
import { createTokensRouter } from './routes/tokens.js';

export const openApiDocumentConfig = {
  openapi: '3.1.0',
  info: {
    title: 'Stagg.rs API',
    version: '0.0.1',
    description:
      'Manage sites, downstream destinations, provisioning jobs and analytics for Stagg.rs.',
  },
} as const;

export function createApp(deps: AppDeps) {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (result.success) {
        return;
      }
      return c.json({ error: 'validation_error', message: result.error.message }, 422);
    },
  });

  app.use('*', async (c, next) => {
    c.set('deps', deps);
    await next();
  });

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    description: 'WorkOS API key or AuthKit access token',
  });

  app.route('/', createHealthRouter());

  app.use('/v1/*', createAuthMiddleware(deps));
  app.route('/v1', createMeRouter());
  app.route('/v1', createOrganizationsRouter());
  app.route('/v1', createSitesRouter());
  app.route('/v1', createDestinationsRouter());
  app.route('/v1', createJobsRouter());
  app.route('/v1', createAnalyticsRouter());
  app.route('/v1', createTokensRouter());

  app.doc('/openapi.json', openApiDocumentConfig);
  app.get('/docs', Scalar({ url: '/openapi.json', pageTitle: 'Stagg.rs API' }));

  app.notFound((c) => c.json({ error: 'not_found', message: 'Not found' }, 404));

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: err.code, message: err.message }, err.status);
    }
    console.error(err);
    return c.json({ error: 'internal_error', message: 'Internal server error' }, 500);
  });

  return app;
}
