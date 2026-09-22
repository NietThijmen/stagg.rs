import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { getPrincipal } from '../lib/access.js';
import { ErrorResponse, PrincipalSchema } from '../schemas.js';

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Auth'],
  summary: 'Describe the authenticated principal',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: PrincipalSchema } },
      description: 'The authenticated principal',
    },
    401: ErrorResponse,
  },
});

export function createMeRouter() {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(meRoute, (c) => {
    const principal = getPrincipal(c);
    return c.json(
      {
        kind: principal.kind,
        subject: principal.subject,
        email: principal.email,
        organizationIds: principal.organizationIds,
        role: principal.role,
        permissions: principal.permissions,
        scopes: principal.scopes,
      },
      200,
    );
  });

  return router;
}
