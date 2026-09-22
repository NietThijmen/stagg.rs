import { Command } from 'commander';
import { addGlobalOptions, resolveContext } from '../context.js';
import { printJson, printTable, type TableColumn } from '../output.js';
import type { Job, Site } from '../types.js';

const siteColumns: TableColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'NAME' },
  { key: 'hostname', header: 'HOSTNAME' },
  { key: 'status', header: 'STATUS' },
  { key: 'organizationId', header: 'ORGANIZATION' },
];

interface SiteBody {
  organizationId?: string;
  name?: string;
  hostname?: string;
  desiredReplicas?: number;
  minReplicas?: number;
  maxReplicas?: number;
  status?: string;
}

function buildBody(options: Record<string, unknown>): SiteBody {
  const body: SiteBody = {};
  if (options.organization !== undefined) body.organizationId = String(options.organization);
  if (options.name !== undefined) body.name = String(options.name);
  if (options.hostname !== undefined) body.hostname = String(options.hostname);
  if (options.desiredReplicas !== undefined) body.desiredReplicas = Number(options.desiredReplicas);
  if (options.minReplicas !== undefined) body.minReplicas = Number(options.minReplicas);
  if (options.maxReplicas !== undefined) body.maxReplicas = Number(options.maxReplicas);
  if (options.status !== undefined) body.status = String(options.status);
  return body;
}

function renderSites(sites: Site[], json: boolean): void {
  if (json) {
    printJson(sites);
    return;
  }
  printTable(sites as unknown as Array<Record<string, unknown>>, siteColumns);
}

export function registerSites(program: Command): void {
  const sites = program.command('sites').description('Manage sites');

  addGlobalOptions(
    sites
      .command('list')
      .description('List sites')
      .option('--organization <id>', 'Filter by organization')
      .option('--limit <n>', 'Maximum results', (value) => Number.parseInt(value, 10)),
  ).action(async (options: { organization?: string; limit?: number }, command: Command) => {
    const { client, json } = resolveContext(command);
    const data = await client.get<Site[]>('/v1/sites', {
      organizationId: options.organization,
      limit: options.limit,
    });
    renderSites(data, json);
  });

  addGlobalOptions(
    sites.command('get').description('Get a site').argument('<siteId>', 'Site ID'),
  ).action(async (siteId: string, _options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    const site = await client.get<Site>(`/v1/sites/${siteId}`);
    renderSites([site], json);
  });

  addGlobalOptions(
    sites
      .command('create')
      .description('Create a site and enqueue provisioning')
      .requiredOption('--organization <id>', 'Organization ID')
      .requiredOption('--name <name>', 'Site name')
      .requiredOption('--hostname <hostname>', 'Site hostname')
      .option('--desired-replicas <n>', 'Desired replicas', (value) => Number.parseInt(value, 10))
      .option('--min-replicas <n>', 'Minimum replicas', (value) => Number.parseInt(value, 10))
      .option('--max-replicas <n>', 'Maximum replicas', (value) => Number.parseInt(value, 10)),
  ).action(async (options: Record<string, unknown>, command: Command) => {
    const { client, json } = resolveContext(command);
    const site = await client.post<Site>('/v1/sites', buildBody(options));
    renderSites([site], json);
  });

  addGlobalOptions(
    sites
      .command('update')
      .description('Update a site')
      .argument('<siteId>', 'Site ID')
      .option('--name <name>', 'Site name')
      .option('--hostname <hostname>', 'Site hostname')
      .option('--desired-replicas <n>', 'Desired replicas', (value) => Number.parseInt(value, 10))
      .option('--min-replicas <n>', 'Minimum replicas', (value) => Number.parseInt(value, 10))
      .option('--max-replicas <n>', 'Maximum replicas', (value) => Number.parseInt(value, 10))
      .option('--status <status>', 'Site status'),
  ).action(async (siteId: string, options: Record<string, unknown>, command: Command) => {
    const { client, json } = resolveContext(command);
    const body = buildBody(options);
    delete body.organizationId;
    if (Object.keys(body).length === 0) {
      throw new Error('Provide at least one field to update');
    }
    const site = await client.patch<Site>(`/v1/sites/${siteId}`, body);
    renderSites([site], json);
  });

  addGlobalOptions(
    sites.command('delete').description('Mark a site for deletion').argument('<siteId>', 'Site ID'),
  ).action(async (siteId: string, _options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    const site = await client.delete<Site>(`/v1/sites/${siteId}`);
    renderSites([site], json);
  });

  addGlobalOptions(
    sites
      .command('provision')
      .description('Enqueue a provisioning job for a site')
      .argument('<siteId>', 'Site ID'),
  ).action(async (siteId: string, _options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    const job = await client.post<Job>(`/v1/sites/${siteId}/provision`);
    if (json) {
      printJson(job);
    } else {
      console.log(`Enqueued ${job.type} job ${job.id} (${job.status})`);
    }
  });
}
