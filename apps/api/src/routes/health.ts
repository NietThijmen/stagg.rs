import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { HealthSchema } from '../schemas.js';

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Service health check',
  responses: {
    200: {
      content: { 'application/json': { schema: HealthSchema } },
      description: 'Service is healthy',
    },
  },
});

export function createHealthRouter() {
  const router = new OpenAPIHono();

  router.openapi(healthRoute, (c) =>
    c.json({ status: 'ok' as const, version: '0.0.1' }, 200),
  );

  return router;
}
