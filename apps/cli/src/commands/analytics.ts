import { Command } from 'commander';
import { addGlobalOptions, resolveContext } from '../context.js';
import { printJson, printTable, type TableColumn } from '../output.js';
import type { SiteAnalytics, Trace, TraceSpan } from '../types.js';

const pointColumns: TableColumn[] = [
  { key: 'bucket', header: 'BUCKET' },
  { key: 'total', header: 'TOTAL' },
  { key: 'errors', header: 'ERRORS' },
  { key: 'p95Latency', header: 'P95 (ms)' },
];

const traceColumns: TableColumn[] = [
  { key: 'traceId', header: 'TRACE ID' },
  { key: 'lastSeen', header: 'LAST SEEN' },
  { key: 'spans', header: 'SPANS' },
  { key: 'maxDurationMs', header: 'MAX (ms)' },
  { key: 'errors', header: 'ERRORS' },
];

const spanColumns: TableColumn[] = [
  { key: 'spanId', header: 'SPAN ID' },
  { key: 'name', header: 'NAME' },
  { key: 'service', header: 'SERVICE' },
  { key: 'durationMs', header: 'DURATION (ms)' },
  { key: 'statusCode', header: 'STATUS' },
  { key: 'timestamp', header: 'TIMESTAMP' },
];

export function registerAnalytics(program: Command): void {
  const analytics = program.command('analytics').description('Query site analytics');

  addGlobalOptions(
    analytics
      .command('summary')
      .description('Summarise downstream request analytics')
      .argument('<siteId>', 'Site ID')
      .option('--from <iso>', 'Start time (ISO 8601)')
      .option('--to <iso>', 'End time (ISO 8601)'),
  ).action(
    async (
      siteId: string,
      options: { from?: string; to?: string },
      command: Command,
    ) => {
      const { client, json } = resolveContext(command);
      const data = await client.get<SiteAnalytics>(`/v1/sites/${siteId}/analytics`, {
        from: options.from,
        to: options.to,
      });

      if (json) {
        printJson(data);
        return;
      }

      console.log(
        `Total: ${data.total}  Errors: ${data.errors}  Error rate: ${(data.errorRate * 100).toFixed(2)}%  P95: ${data.p95Latency.toFixed(1)}ms`,
      );
      printTable(data.points as unknown as Array<Record<string, unknown>>, pointColumns);
    },
  );

  addGlobalOptions(
    analytics
      .command('traces')
      .description('List recent traces')
      .argument('<siteId>', 'Site ID')
      .option('--limit <n>', 'Maximum results', (value) => Number.parseInt(value, 10)),
  ).action(
    async (siteId: string, options: { limit?: number }, command: Command) => {
      const { client, json } = resolveContext(command);
      const data = await client.get<Trace[]>(`/v1/sites/${siteId}/traces`, {
        limit: options.limit,
      });
      if (json) {
        printJson(data);
        return;
      }
      printTable(data as unknown as Array<Record<string, unknown>>, traceColumns);
    },
  );

  addGlobalOptions(
    analytics
      .command('trace')
      .description('Show all spans for a trace')
      .argument('<siteId>', 'Site ID')
      .argument('<traceId>', 'Trace ID'),
  ).action(
    async (siteId: string, traceId: string, _options: unknown, command: Command) => {
      const { client, json } = resolveContext(command);
      const data = await client.get<TraceSpan[]>(
        `/v1/sites/${siteId}/traces/${traceId}`,
      );
      if (json) {
        printJson(data);
        return;
      }
      printTable(data as unknown as Array<Record<string, unknown>>, spanColumns);
    },
  );
}
