import { json, error } from '@sveltejs/kit';
import { createClickHouseClient } from '@staggers/clickhouse';
import { loadConfig } from '@staggers/config';
import { prisma } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  await requireAuth(event);

  const config = loadConfig();
  const site = await prisma.site.findUnique({
    where: { id: event.params.websiteId },
  });

  if (!site) {
    throw error(404, 'Website not found');
  }

  // TODO: verify the site belongs to the user's current WorkOS organization.

  const clickhouse = createClickHouseClient(config.clickhouse);

  const from = event.url.searchParams.get('from');
  const to = event.url.searchParams.get('to');

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const defaultTo = now.toISOString();

  const result = await clickhouse.query({
    query: `
      SELECT
        toStartOfInterval(timestamp, INTERVAL 5 minute) AS bucket,
        count() AS total,
        countIf(http_status_code >= 400) AS errors,
        quantile(0.95)(duration_ms) AS p95_latency
      FROM downstream_requests
      WHERE site_id = {siteId:String}
        AND timestamp >= {from:String}
        AND timestamp < {to:String}
      GROUP BY bucket
      ORDER BY bucket
    `,
    query_params: {
      siteId: site.id,
      from: from ?? defaultFrom,
      to: to ?? defaultTo,
    },
    format: 'JSONEachRow',
  });

  const rows = await result.json<{ bucket: string; total: string; errors: string; p95_latency: number }>();

  return json({
    siteId: site.id,
    rows: rows.map((r) => ({
      bucket: r.bucket,
      total: Number(r.total),
      errors: Number(r.errors),
      p95Latency: r.p95_latency,
    })),
  });
};
