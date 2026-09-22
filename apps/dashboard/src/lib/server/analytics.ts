import {
  createAnalyticsService,
  type AnalyticsService,
} from '@staggers/analytics';
import { loadConfig } from '@staggers/config';

let service: AnalyticsService | null = null;

function getService(): AnalyticsService {
  if (!service) {
    service = createAnalyticsService(loadConfig().clickhouse);
  }
  return service;
}

export type {
  AnalyticsPoint,
  SiteAnalytics,
  RecentTrace,
  TraceSpan,
} from '@staggers/analytics';

export const getSiteAnalytics: AnalyticsService['getSiteAnalytics'] = (...args) =>
  getService().getSiteAnalytics(...args);

export const listRecentTraces: AnalyticsService['listRecentTraces'] = (...args) =>
  getService().listRecentTraces(...args);

export const getTrace: AnalyticsService['getTrace'] = (...args) =>
  getService().getTrace(...args);
