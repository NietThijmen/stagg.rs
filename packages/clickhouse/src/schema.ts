// Raw OTEL tables are created by the OpenTelemetry Collector clickhouse exporter.
// The tables below are product-oriented derived tables for the dashboard.

export const derivedSchemas = `
CREATE TABLE IF NOT EXISTS downstream_requests (
  organization_id String,
  site_id String,
  trace_id String,
  span_id String,
  parent_span_id String,
  timestamp DateTime64(9),
  destination_host String,
  http_method LowCardinality(String),
  http_status_code UInt16,
  duration_ms Float64,
  timeout UInt8,
  retry_count UInt16,
  envoy_response_flags LowCardinality(String),
  container_id String,
  deployment_id String
)
ENGINE = MergeTree()
ORDER BY (organization_id, site_id, timestamp)
TTL timestamp + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS site_health_hourly (
  organization_id String,
  site_id String,
  bucket DateTime,
  total_requests UInt64,
  error_4xx UInt64,
  error_5xx UInt64,
  timeout_count UInt64,
  p50_latency_ms Float64,
  p95_latency_ms Float64,
  p99_latency_ms Float64
)
ENGINE = SummingMergeTree()
ORDER BY (organization_id, site_id, bucket)
TTL bucket + INTERVAL 180 DAY;
`;

export async function initializeDerivedTables(client: { exec: (query: string) => Promise<unknown> }) {
  await client.exec(derivedSchemas);
}
