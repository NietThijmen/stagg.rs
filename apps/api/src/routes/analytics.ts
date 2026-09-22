import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import { getDeps, requireSiteAccess } from '../lib/access.js';
import { notFound } from '../lib/errors.js';
import {
  ErrorResponse,
  SiteAnalyticsSchema,
  TraceSchema,
  TraceSpanSchema,
} from '../schemas.js';

const analyticsParams = z.object({ siteId: z.string().uuid() });

const getAnalyticsRoute = createRoute({
  method: 'get',
  path: '/sites/{siteId}/analytics',
  tags: ['Analytics'],
  summary: 'Get downstream request analytics for a site',
  security: [{ bearerAuth: [] }],
  request: {
    params: analyticsParams,
    query: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: SiteAnalyticsSchema } },
      description: 'Site analytics',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const listTracesRoute = createRoute({
  method: 'get',
  path: '/sites/{siteId}/traces',
  tags: ['Analytics'],
  summary: 'List recent traces for a site',
  security: [{ bearerAuth: [] }],
  request: {
    params: analyticsParams,
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(TraceSchema) } },
      description: 'Recent traces',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const getTraceRoute = createRoute({
  method: 'get',
  path: '/sites/{siteId}/traces/{traceId}',
  tags: ['Analytics'],
  summary: 'Get all spans for a trace',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ siteId: z.string().uuid(), traceId: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(TraceSpanSchema) } },
      description: 'Trace spans',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

export function createAnalyticsRouter() {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(getAnalyticsRoute, async (c) => {
    const { siteId } = c.req.valid('param');
    const { from, to } = c.req.valid('query');
    const site = await requireSiteAccess(c, siteId, 'analytics:read');
    const deps = getDeps(c);

    const now = new Date();
    const fromDate = parseDate(from, new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const toDate = parseDate(to, now);

    const analytics = await deps.analytics.getSiteAnalytics(site.id, fromDate, toDate);

    return c.json(
      {
        siteId: site.id,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        ...analytics,
      },
      200,
    );
  });

  router.openapi(listTracesRoute, async (c) => {
    const { siteId } = c.req.valid('param');
    const { limit } = c.req.valid('query');
    const site = await requireSiteAccess(c, siteId, 'analytics:read');
    const deps = getDeps(c);

    const traces = await deps.analytics.listRecentTraces(site.id, limit ?? 10);
    return c.json(traces, 200);
  });

  router.openapi(getTraceRoute, async (c) => {
    const { siteId, traceId } = c.req.valid('param');
    const site = await requireSiteAccess(c, siteId, 'analytics:read');
    const deps = getDeps(c);

    const belongs = await deps.analytics.traceBelongsToSite(site.id, traceId);
    if (!belongs) {
      throw notFound('Trace not found');
    }

    const spans = await deps.analytics.getTrace(traceId);
    return c.json(spans, 200);
  });

  return router;
}

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
