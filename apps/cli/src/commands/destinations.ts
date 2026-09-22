import { Command } from 'commander';
import { addGlobalOptions, resolveContext } from '../context.js';
import { printJson, printTable, type TableColumn } from '../output.js';
import type { Destination } from '../types.js';

const destinationColumns: TableColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'NAME' },
  { key: 'host', header: 'HOST' },
  { key: 'port', header: 'PORT' },
  { key: 'protocol', header: 'PROTOCOL' },
  { key: 'enabled', header: 'ENABLED' },
];

interface DestinationBody {
  name?: string;
  host?: string;
  port?: number;
  protocol?: string;
  enabled?: boolean;
}

function buildBody(options: Record<string, unknown>): DestinationBody {
  const body: DestinationBody = {};
  if (options.name !== undefined) body.name = String(options.name);
  if (options.host !== undefined) body.host = String(options.host);
  if (options.port !== undefined) body.port = Number(options.port);
  if (options.protocol !== undefined) body.protocol = String(options.protocol);
  if (options.disabled !== undefined) body.enabled = !options.disabled;
  if (options.enabled !== undefined) body.enabled = Boolean(options.enabled);
  return body;
}

function renderDestinations(destinations: Destination[], json: boolean): void {
  if (json) {
    printJson(destinations);
    return;
  }
  printTable(
    destinations as unknown as Array<Record<string, unknown>>,
    destinationColumns,
  );
}

export function registerDestinations(program: Command): void {
  const destinations = program
    .command('destinations')
    .description('Manage downstream destinations');

  addGlobalOptions(
    destinations
      .command('list')
      .description('List destinations for a site')
      .argument('<siteId>', 'Site ID'),
  ).action(async (siteId: string, _options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    const data = await client.get<Destination[]>(`/v1/sites/${siteId}/destinations`);
    renderDestinations(data, json);
  });

  addGlobalOptions(
    destinations
      .command('get')
      .description('Get a destination')
      .argument('<siteId>', 'Site ID')
      .argument('<destinationId>', 'Destination ID'),
  ).action(
    async (
      siteId: string,
      destinationId: string,
      _options: unknown,
      command: Command,
    ) => {
      const { client, json } = resolveContext(command);
      const destination = await client.get<Destination>(
        `/v1/sites/${siteId}/destinations/${destinationId}`,
      );
      renderDestinations([destination], json);
    },
  );

  addGlobalOptions(
    destinations
      .command('create')
      .description('Create a downstream destination')
      .argument('<siteId>', 'Site ID')
      .requiredOption('--name <name>', 'Destination name')
      .requiredOption('--host <host>', 'Destination host')
      .option('--port <port>', 'Destination port', (value) => Number.parseInt(value, 10))
      .option('--protocol <protocol>', 'http or https')
      .option('--disabled', 'Create the destination disabled'),
  ).action(async (siteId: string, options: Record<string, unknown>, command: Command) => {
    const { client, json } = resolveContext(command);
    const destination = await client.post<Destination>(
      `/v1/sites/${siteId}/destinations`,
      buildBody(options),
    );
    renderDestinations([destination], json);
  });

  addGlobalOptions(
    destinations
      .command('update')
      .description('Update a downstream destination')
      .argument('<siteId>', 'Site ID')
      .argument('<destinationId>', 'Destination ID')
      .option('--name <name>', 'Destination name')
      .option('--host <host>', 'Destination host')
      .option('--port <port>', 'Destination port', (value) => Number.parseInt(value, 10))
      .option('--protocol <protocol>', 'http or https')
      .option('--disabled', 'Disable the destination')
      .option('--enabled', 'Enable the destination'),
  ).action(
    async (
      siteId: string,
      destinationId: string,
      options: Record<string, unknown>,
      command: Command,
    ) => {
      const { client, json } = resolveContext(command);
      const body = buildBody(options);
      if (Object.keys(body).length === 0) {
        throw new Error('Provide at least one field to update');
      }
      const destination = await client.patch<Destination>(
        `/v1/sites/${siteId}/destinations/${destinationId}`,
        body,
      );
      renderDestinations([destination], json);
    },
  );

  addGlobalOptions(
    destinations
      .command('delete')
      .description('Delete a downstream destination')
      .argument('<siteId>', 'Site ID')
      .argument('<destinationId>', 'Destination ID'),
  ).action(
    async (
      siteId: string,
      destinationId: string,
      _options: unknown,
      command: Command,
    ) => {
      const { client, json } = resolveContext(command);
      await client.delete(`/v1/sites/${siteId}/destinations/${destinationId}`);
      if (json) {
        printJson({ deleted: true, destinationId });
      } else {
        console.log(`Deleted destination ${destinationId}`);
      }
    },
  );
}
