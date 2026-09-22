import { createClient, ClickHouseClient } from '@clickhouse/client';

export interface ClickHouseConfig {
  url: string;
  username?: string;
  password?: string;
  database?: string;
}

export function createClickHouseClient(config: ClickHouseConfig): ClickHouseClient {
  return createClient({
    url: config.url,
    username: config.username,
    password: config.password,
    database: config.database,
    request_timeout: 30_000,
  });
}

export * from '@clickhouse/client';
