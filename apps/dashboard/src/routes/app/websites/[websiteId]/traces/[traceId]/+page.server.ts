import { requireSiteAccess } from '$lib/server/authz';
import { getTrace, type TraceSpan } from '$lib/server/analytics';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { site } = await requireSiteAccess(event, event.params.websiteId);

  let spans: TraceSpan[] = [];
  let traceError: string | null = null;

  try {
    spans = await getTrace(event.params.traceId);
  } catch (err) {
    console.error('Failed to load trace:', err);
    traceError = err instanceof Error ? err.message : 'Failed to load trace';
  }

  return { site, traceId: event.params.traceId, spans, traceError };
};
