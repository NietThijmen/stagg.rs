import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import {
  getDeps,
  getPrincipal,
  requireOrganizationAccess,
  requireScope,
  requireSiteAccess,
} from '../lib/access.js';
import { conflict, notFound } from '../lib/errors.js';
import { enqueueJob } from '../lib/jobs.js';
import { toJob, toSite } from '../lib/serializers.js';
import { ensureOrganizations } from '../lib/workos-sync.js';
import {
  CreateSiteSchema,
  ErrorResponse,
  JobSchema,
  SiteSchema,
  UpdateSiteSchema,
} from '../schemas.js';

const listSitesRoute = createRoute({
  method: 'get',
  path: '/sites',
  tags: ['Sites'],
  summary: 'List sites',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      organizationId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(SiteSchema) } },
      description: 'Sites',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const createSiteRoute = createRoute({
  method: 'post',
  path: '/sites',
  tags: ['Sites'],
  summary: 'Create a site and enqueue provisioning',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateSiteSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: SiteSchema } },
      description: 'Site created',
    },
    400: ErrorResponse,
    401: ErrorResponse,
    403: ErrorResponse,
    409: ErrorResponse,
  },
});

const getSiteRoute = createRoute({
  method: 'get',
  path: '/sites/{siteId}',
  tags: ['Sites'],
  summary: 'Get a site',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ siteId: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: SiteSchema } },
      description: 'The site',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const updateSiteRoute = createRoute({
  method: 'patch',
  path: '/sites/{siteId}',
  tags: ['Sites'],
  summary: 'Update a site',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ siteId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: UpdateSiteSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: SiteSchema } },
      description: 'The updated site',
    },
    400: ErrorResponse,
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
    409: ErrorResponse,
  },
});

const deleteSiteRoute = createRoute({
  method: 'delete',
  path: '/sites/{siteId}',
  tags: ['Sites'],
  summary: 'Mark a site for deletion',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ siteId: z.string().uuid() }) },
  responses: {
    202: {
      content: { 'application/json': { schema: SiteSchema } },
      description: 'Site marked as deleting',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const provisionSiteRoute = createRoute({
  method: 'post',
  path: '/sites/{siteId}/provision',
  tags: ['Sites'],
  summary: 'Enqueue a provisioning job for a site',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ siteId: z.string().uuid() }) },
  responses: {
    202: {
      content: { 'application/json': { schema: JobSchema } },
      description: 'Provisioning job enqueued',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

export function createSitesRouter() {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(listSitesRoute, async (c) => {
    requireScope(c, 'sites:read');
    const { organizationId, limit } = c.req.valid('query');
    const principal = getPrincipal(c);
    const deps = getDeps(c);

    if (organizationId && !principal.organizationIds.includes(organizationId)) {
      throw notFound('Organization not found');
    }

    const sites = await deps.prisma.site.findMany({
      where: {
        organizationId: organizationId ?? { in: principal.organizationIds },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ?? 50,
    });

    return c.json(sites.map(toSite), 200);
  });

  router.openapi(createSiteRoute, async (c) => {
    const body = c.req.valid('json');
    requireOrganizationAccess(c, body.organizationId, 'sites:write');

    const deps = getDeps(c);
    await ensureOrganizations(deps.prisma, deps.workos, [body.organizationId]);

    const existing = await deps.prisma.site.findUnique({
      where: { hostname: body.hostname },
    });
    if (existing) {
      throw conflict('Hostname is already in use');
    }

    const site = await deps.prisma.site.create({
      data: {
        organizationId: body.organizationId,
        name: body.name,
        hostname: body.hostname,
        previewHostname: `preview-${crypto.randomUUID().slice(0, 8)}.${deps.config.platformDomain}`,
        desiredReplicas: body.desiredReplicas,
        minReplicas: body.minReplicas,
        maxReplicas: body.maxReplicas,
        status: 'pending',
      },
    });

    await enqueueJob(deps.prisma, {
      organizationId: site.organizationId,
      siteId: site.id,
      type: 'provision_site',
    });

    return c.json(toSite(site), 201);
  });

  router.openapi(getSiteRoute, async (c) => {
    const { siteId } = c.req.valid('param');
    const site = await requireSiteAccess(c, siteId, 'sites:read');
    return c.json(toSite(site), 200);
  });

  router.openapi(updateSiteRoute, async (c) => {
    const { siteId } = c.req.valid('param');
    const body = c.req.valid('json');
    const site = await requireSiteAccess(c, siteId, 'sites:write');
    const deps = getDeps(c);

    if (body.hostname && body.hostname !== site.hostname) {
      const existing = await deps.prisma.site.findUnique({
        where: { hostname: body.hostname },
      });
      if (existing && existing.id !== site.id) {
        throw conflict('Hostname is already in use');
      }
    }

    const updated = await deps.prisma.site.update({
      where: { id: site.id },
      data: {
        name: body.name,
        hostname: body.hostname,
        desiredReplicas: body.desiredReplicas,
        minReplicas: body.minReplicas,
        maxReplicas: body.maxReplicas,
        status: body.status,
      },
    });

    return c.json(toSite(updated), 200);
  });

  router.openapi(deleteSiteRoute, async (c) => {
    const { siteId } = c.req.valid('param');
    const site = await requireSiteAccess(c, siteId, 'sites:write');
    const deps = getDeps(c);

    const updated = await deps.prisma.site.update({
      where: { id: site.id },
      data: { status: 'deleting' },
    });

    return c.json(toSite(updated), 202);
  });

  router.openapi(provisionSiteRoute, async (c) => {
    const { siteId } = c.req.valid('param');
    const site = await requireSiteAccess(c, siteId, 'sites:write');
    const deps = getDeps(c);

    const job = await enqueueJob(deps.prisma, {
      organizationId: site.organizationId,
      siteId: site.id,
      type: 'provision_site',
    });

    return c.json(toJob(job), 202);
  });

  return router;
}
