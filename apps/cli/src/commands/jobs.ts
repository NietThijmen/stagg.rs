import { Command } from 'commander';
import { addGlobalOptions, resolveContext } from '../context.js';
import { printJson, printTable, type TableColumn } from '../output.js';
import type { Job } from '../types.js';

const jobColumns: TableColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'type', header: 'TYPE' },
  { key: 'status', header: 'STATUS' },
  { key: 'siteId', header: 'SITE' },
  { key: 'error', header: 'ERROR' },
  { key: 'createdAt', header: 'CREATED' },
];

const jobTypes = [
  'create_gtm_container',
  'fetch_container_config',
  'sync_egress_config',
  'provision_site',
];

function renderJobs(jobs: Job[], json: boolean): void {
  if (json) {
    printJson(jobs);
    return;
  }
  printTable(jobs as unknown as Array<Record<string, unknown>>, jobColumns);
}

export function registerJobs(program: Command): void {
  const jobs = program.command('jobs').description('Manage provisioning jobs');

  addGlobalOptions(
    jobs
      .command('list')
      .description('List provisioning jobs')
      .option('--site <siteId>', 'Filter by site')
      .option('--status <status>', 'Filter by status')
      .option('--limit <n>', 'Maximum results', (value) => Number.parseInt(value, 10)),
  ).action(async (options: Record<string, unknown>, command: Command) => {
    const { client, json } = resolveContext(command);
    const data = await client.get<Job[]>('/v1/jobs', {
      siteId: options.site as string | undefined,
      status: options.status as string | undefined,
      limit: options.limit as number | undefined,
    });
    renderJobs(data, json);
  });

  addGlobalOptions(
    jobs.command('get').description('Get a provisioning job').argument('<jobId>', 'Job ID'),
  ).action(async (jobId: string, _options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    const job = await client.get<Job>(`/v1/jobs/${jobId}`);
    renderJobs([job], json);
  });

  addGlobalOptions(
    jobs
      .command('create')
      .description('Enqueue a provisioning job')
      .requiredOption('--site <siteId>', 'Site ID')
      .requiredOption('--type <type>', `Job type (${jobTypes.join(', ')})`),
  ).action(async (options: { site: string; type: string }, command: Command) => {
    if (!jobTypes.includes(options.type)) {
      throw new Error(`Unknown job type: ${options.type}`);
    }
    const { client, json } = resolveContext(command);
    const job = await client.post<Job>('/v1/jobs', {
      siteId: options.site,
      type: options.type,
    });
    renderJobs([job], json);
  });
}
