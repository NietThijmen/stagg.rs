import { createClickHouseClient, type ClickHouseClient } from '@staggers/clickhouse';
import { loadConfig } from '@staggers/config';

let client: ClickHouseClient | null = null;

function getClient(): ClickHouseClient {
  if (!client) {
    client = createClickHouseClient(loadConfig().clickhouse);
  }
  return client;
}

function toClickHouseDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

export interface AnalyticsPoint {
  bucket: string;
  total: number;
  errors: number;
  p95Latency: number;
}

export interface SiteAnalytics {
  points: AnalyticsPoint[];
  total: number;
  errors: number;
  errorRate: number;
  p95Latency: number;
}

export interface RecentTrace {
  traceId: string;
  lastSeen: string;
  spans: number;
  maxDurationMs: number;
  errors: number;
}

export interface TraceSpan {
  spanId: string;
  parentSpanId: string;
  name: string;
  service: string;
  durationMs: number;
  statusCode: string;
  timestamp: string;
}

export async function getSiteAnalytics(
  siteId: string,
  from: Date,
  to: Date,
): Promise<SiteAnalytics> {
  const result = await getClient().query({
    query: `
      SELECT
        toStartOfInterval(timestamp, INTERVAL 5 minute) AS bucket,
        count() AS total,
        countIf(http_status_code >= 400) AS errors,
        quantile(0.95)(duration_ms) AS p95_latency
      FROM downstream_requests
      WHERE site_id = {siteId:String}
        AND timestamp >= {from:DateTime64(3)}
        AND timestamp < {to:DateTime64(3)}
      GROUP BY bucket
      ORDER BY bucket
    `,
    query_params: {
      siteId,
      from: toClickHouseDateTime(from),
      to: toClickHouseDateTime(to),
    },
    format: 'JSONEachRow',
  });

  const rows = await result.json<{
    bucket: string;
    total: string;
    errors: string;
    p95_latency: number;
  }>();

  const points = rows.map((row) => ({
    bucket: row.bucket,
    total: Number(row.total),
    errors: Number(row.errors),
    p95Latency: Number(row.p95_latency),
  }));

  const total = points.reduce((sum, point) => sum + point.total, 0);
  const errors = points.reduce((sum, point) => sum + point.errors, 0);
  const p95Latency = points.length
    ? Math.max(...points.map((point) => point.p95Latency))
    : 0;

  return {
    points,
    total,
    errors,
    errorRate: total > 0 ? errors / total : 0,
    p95Latency,
  };
}

export async function listRecentTraces(siteId: string, limit = 10): Promise<RecentTrace[]> {
  const result = await getClient().query({
    query: `
      SELECT
        trace_id,
        max(timestamp) AS last_seen,
        count() AS spans,
        max(duration_ms) AS max_duration_ms,
        countIf(http_status_code >= 400) AS errors
      FROM downstream_requests
      WHERE site_id = {siteId:String}
        AND trace_id != ''
      GROUP BY trace_id
      ORDER BY last_seen DESC
      LIMIT {limit:UInt32}
    `,
    query_params: { siteId, limit },
    format: 'JSONEachRow',
  });

  const rows = await result.json<{
    trace_id: string;
    last_seen: string;
    spans: string;
    max_duration_ms: number;
    errors: string;
  }>();

  return rows.map((row) => ({
    traceId: row.trace_id,
    lastSeen: row.last_seen,
    spans: Number(row.spans),
    maxDurationMs: Number(row.max_duration_ms),
    errors: Number(row.errors),
  }));
}

export async function getTrace(traceId: string): Promise<TraceSpan[]> {
  const result = await getClient().query({
    query: `
      SELECT
        SpanId AS span_id,
        ParentSpanId AS parent_span_id,
        SpanName AS name,
        ServiceName AS service,
        Duration AS duration_ns,
        StatusCode AS status_code,
        Timestamp AS timestamp
      FROM otel_traces
      WHERE TraceId = {traceId:String}
      ORDER BY Timestamp
    `,
    query_params: { traceId },
    format: 'JSONEachRow',
  });

  const rows = await result.json<{
    span_id: string;
    parent_span_id: string;
    name: string;
    service: string;
    duration_ns: string;
    status_code: string;
    timestamp: string;
  }>();

  return rows.map((row) => ({
    spanId: row.span_id,
    parentSpanId: row.parent_span_id,
    name: row.name,
    service: row.service,
    durationMs: Number(row.duration_ns) / 1_000_000,
    statusCode: row.status_code,
    timestamp: row.timestamp,
  }));
}
