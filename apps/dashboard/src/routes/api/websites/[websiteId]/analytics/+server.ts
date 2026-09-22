import { json } from '@sveltejs/kit';
import { requireSiteAccess } from '$lib/server/authz';
import { getSiteAnalytics } from '$lib/server/analytics';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  const { site } = await requireSiteAccess(event, event.params.websiteId);

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const from = parseDate(event.url.searchParams.get('from'), defaultFrom);
  const to = parseDate(event.url.searchParams.get('to'), now);

  const analytics = await getSiteAnalytics(site.id, from, to);

  return json({
    siteId: site.id,
    from: from.toISOString(),
    to: to.toISOString(),
    ...analytics,
  });
};

function parseDate(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
