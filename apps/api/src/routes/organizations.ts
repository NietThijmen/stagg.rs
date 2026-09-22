import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import {
  getDeps,
  getPrincipal,
  requireOrganizationAccess,
  requireScope,
} from '../lib/access.js';
import { notFound } from '../lib/errors.js';
import { toOrganization } from '../lib/serializers.js';
import { ensureOrganizations } from '../lib/workos-sync.js';
import { ErrorResponse, OrganizationSchema } from '../schemas.js';

const listOrganizationsRoute = createRoute({
  method: 'get',
  path: '/organizations',
  tags: ['Organizations'],
  summary: 'List organizations the principal can access',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(OrganizationSchema) } },
      description: 'Accessible organizations',
    },
    401: ErrorResponse,
    403: ErrorResponse,
  },
});

const getOrganizationRoute = createRoute({
  method: 'get',
  path: '/organizations/{organizationId}',
  tags: ['Organizations'],
  summary: 'Get an organization',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ organizationId: z.string() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: OrganizationSchema } },
      description: 'The organization',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

export function createOrganizationsRouter() {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(listOrganizationsRoute, async (c) => {
    requireScope(c, 'organizations:read');
    const deps = getDeps(c);
    const organizationIds = getPrincipal(c).organizationIds;

    await ensureOrganizations(deps.prisma, deps.workos, organizationIds);

    const organizations = await deps.prisma.organization.findMany({
      where: { id: { in: organizationIds } },
      orderBy: { name: 'asc' },
    });

    return c.json(organizations.map(toOrganization), 200);
  });

  router.openapi(getOrganizationRoute, async (c) => {
    const { organizationId } = c.req.valid('param');
    requireOrganizationAccess(c, organizationId, 'organizations:read');

    const deps = getDeps(c);
    await ensureOrganizations(deps.prisma, deps.workos, [organizationId]);

    const organization = await deps.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw notFound('Organization not found');
    }

    return c.json(toOrganization(organization), 200);
  });

  return router;
}
