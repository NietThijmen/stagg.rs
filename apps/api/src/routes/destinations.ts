import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { AppEnv } from '../types.js';
import { getDeps, requireSiteAccess } from '../lib/access.js';
import { notFound } from '../lib/errors.js';
import { enqueueJob } from '../lib/jobs.js';
import { toDestination } from '../lib/serializers.js';
import {
  CreateDestinationSchema,
  DestinationSchema,
  ErrorResponse,
  UpdateDestinationSchema,
} from '../schemas.js';

const siteParams = z.object({ siteId: z.string().uuid() });
const destinationParams = z.object({
  siteId: z.string().uuid(),
  destinationId: z.string().uuid(),
});

const listDestinationsRoute = createRoute({
  method: 'get',
  path: '/sites/{siteId}/destinations',
  tags: ['Destinations'],
  summary: 'List downstream destinations for a site',
  security: [{ bearerAuth: [] }],
  request: { params: siteParams },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(DestinationSchema) } },
      description: 'Destinations',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const createDestinationRoute = createRoute({
  method: 'post',
  path: '/sites/{siteId}/destinations',
  tags: ['Destinations'],
  summary: 'Create a downstream destination',
  security: [{ bearerAuth: [] }],
  request: {
    params: siteParams,
    body: { content: { 'application/json': { schema: CreateDestinationSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: DestinationSchema } },
      description: 'Destination created',
    },
    400: ErrorResponse,
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const getDestinationRoute = createRoute({
  method: 'get',
  path: '/sites/{siteId}/destinations/{destinationId}',
  tags: ['Destinations'],
  summary: 'Get a downstream destination',
  security: [{ bearerAuth: [] }],
  request: { params: destinationParams },
  responses: {
    200: {
      content: { 'application/json': { schema: DestinationSchema } },
      description: 'The destination',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const updateDestinationRoute = createRoute({
  method: 'patch',
  path: '/sites/{siteId}/destinations/{destinationId}',
  tags: ['Destinations'],
  summary: 'Update a downstream destination',
  security: [{ bearerAuth: [] }],
  request: {
    params: destinationParams,
    body: { content: { 'application/json': { schema: UpdateDestinationSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: DestinationSchema } },
      description: 'The updated destination',
    },
    400: ErrorResponse,
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const deleteDestinationRoute = createRoute({
  method: 'delete',
  path: '/sites/{siteId}/destinations/{destinationId}',
  tags: ['Destinations'],
  summary: 'Delete a downstream destination',
  security: [{ bearerAuth: [] }],
  request: { params: destinationParams },
  responses: {
    204: { description: 'Destination deleted' },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

export function createDestinationsRouter() {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(listDestinationsRoute, async (c) => {
    const { siteId } = c.req.valid('param');
    const site = await requireSiteAccess(c, siteId, 'destinations:read');
    const deps = getDeps(c);

    const destinations = await deps.prisma.downstreamDestination.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: 'asc' },
    });

    return c.json(destinations.map(toDestination), 200);
  });

  router.openapi(createDestinationRoute, async (c) => {
    const { siteId } = c.req.valid('param');
    const body = c.req.valid('json');
    const site = await requireSiteAccess(c, siteId, 'destinations:write');
    const deps = getDeps(c);

    const destination = await deps.prisma.downstreamDestination.create({
      data: {
        siteId: site.id,
        organizationId: site.organizationId,
        name: body.name,
        host: body.host.toLowerCase(),
        port: body.port ?? 443,
        protocol: body.protocol ?? 'https',
        enabled: body.enabled ?? true,
      },
    });

    await enqueueJob(deps.prisma, {
      organizationId: site.organizationId,
      siteId: site.id,
      type: 'sync_egress_config',
    });

    return c.json(toDestination(destination), 201);
  });

  router.openapi(getDestinationRoute, async (c) => {
    const { siteId, destinationId } = c.req.valid('param');
    const site = await requireSiteAccess(c, siteId, 'destinations:read');
    const destination = await findDestination(c, site.id, destinationId);
    return c.json(toDestination(destination), 200);
  });

  router.openapi(updateDestinationRoute, async (c) => {
    const { siteId, destinationId } = c.req.valid('param');
    const body = c.req.valid('json');
    const site = await requireSiteAccess(c, siteId, 'destinations:write');
    const destination = await findDestination(c, site.id, destinationId);
    const deps = getDeps(c);

    const updated = await deps.prisma.downstreamDestination.update({
      where: { id: destination.id },
      data: {
        name: body.name,
        host: body.host?.toLowerCase(),
        port: body.port,
        protocol: body.protocol,
        enabled: body.enabled,
      },
    });

    await enqueueJob(deps.prisma, {
      organizationId: site.organizationId,
      siteId: site.id,
      type: 'sync_egress_config',
    });

    return c.json(toDestination(updated), 200);
  });

  router.openapi(deleteDestinationRoute, async (c) => {
    const { siteId, destinationId } = c.req.valid('param');
    const site = await requireSiteAccess(c, siteId, 'destinations:write');
    const destination = await findDestination(c, site.id, destinationId);
    const deps = getDeps(c);

    await deps.prisma.downstreamDestination.delete({ where: { id: destination.id } });

    await enqueueJob(deps.prisma, {
      organizationId: site.organizationId,
      siteId: site.id,
      type: 'sync_egress_config',
    });

    return c.body(null, 204);
  });

  return router;
}

async function findDestination(
  c: Context<AppEnv>,
  siteId: string,
  destinationId: string,
) {
  const destination = await getDeps(c).prisma.downstreamDestination.findUnique({
    where: { id: destinationId },
  });

  if (!destination || destination.siteId !== siteId) {
    throw notFound('Destination not found');
  }

  return destination;
}
