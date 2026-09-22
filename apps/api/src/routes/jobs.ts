import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { getDeps, getPrincipal, requireScope, requireSiteAccess } from '../lib/access.js';
import { notFound } from '../lib/errors.js';
import { enqueueJob } from '../lib/jobs.js';
import { toJob } from '../lib/serializers.js';
import { CreateJobSchema, ErrorResponse, JobSchema } from '../schemas.js';

const listJobsRoute = createRoute({
  method: 'get',
  path: '/jobs',
  tags: ['Jobs'],
  summary: 'List provisioning jobs',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      siteId: z.string().uuid().optional(),
      status: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(JobSchema) } },
      description: 'Provisioning jobs',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const getJobRoute = createRoute({
  method: 'get',
  path: '/jobs/{jobId}',
  tags: ['Jobs'],
  summary: 'Get a provisioning job',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ jobId: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: JobSchema } },
      description: 'The provisioning job',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const createJobRoute = createRoute({
  method: 'post',
  path: '/jobs',
  tags: ['Jobs'],
  summary: 'Enqueue a provisioning job',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateJobSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: JobSchema } },
      description: 'Job enqueued',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

export function createJobsRouter() {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(listJobsRoute, async (c) => {
    requireScope(c, 'jobs:read');
    const { siteId, status, limit } = c.req.valid('query');
    const principal = getPrincipal(c);
    const deps = getDeps(c);

    if (siteId) {
      await requireSiteAccess(c, siteId, 'jobs:read');
    }

    const jobs = await deps.prisma.provisioningJob.findMany({
      where: {
        organizationId: { in: principal.organizationIds },
        siteId: siteId ?? undefined,
        status: status ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit ?? 50,
    });

    return c.json(jobs.map(toJob), 200);
  });

  router.openapi(getJobRoute, async (c) => {
    requireScope(c, 'jobs:read');
    const { jobId } = c.req.valid('param');
    const principal = getPrincipal(c);
    const deps = getDeps(c);

    const job = await deps.prisma.provisioningJob.findUnique({ where: { id: jobId } });
    if (!job || !principal.organizationIds.includes(job.organizationId)) {
      throw notFound('Job not found');
    }

    return c.json(toJob(job), 200);
  });

  router.openapi(createJobRoute, async (c) => {
    const { siteId, type, payload } = c.req.valid('json');
    const site = await requireSiteAccess(c, siteId, 'jobs:write');
    const deps = getDeps(c);

    const job = await enqueueJob(deps.prisma, {
      organizationId: site.organizationId,
      siteId: site.id,
      type,
      payload,
    });

    return c.json(toJob(job), 201);
  });

  return router;
}
