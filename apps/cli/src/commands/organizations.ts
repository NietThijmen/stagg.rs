import { Command } from 'commander';
import { addGlobalOptions, resolveContext } from '../context.js';
import { printJson, printTable, type TableColumn } from '../output.js';
import type { Organization, Principal } from '../types.js';

const organizationColumns: TableColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'NAME' },
  { key: 'workosId', header: 'WORKOS ID' },
];

export function registerOrganizations(program: Command): void {
  const organizations = program
    .command('orgs')
    .description('Manage organizations');

  addGlobalOptions(
    organizations.command('list').description('List accessible organizations'),
  ).action(async (_options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    const data = await client.get<Organization[]>('/v1/organizations');
    if (json) {
      printJson(data);
      return;
    }
    printTable(data as unknown as Array<Record<string, unknown>>, organizationColumns);
  });

  addGlobalOptions(
    organizations
      .command('get')
      .description('Get an organization')
      .argument('<organizationId>', 'Organization ID'),
  ).action(async (organizationId: string, _options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    const organization = await client.get<Organization>(
      `/v1/organizations/${organizationId}`,
    );
    if (json) {
      printJson(organization);
      return;
    }
    printTable(
      [organization] as unknown as Array<Record<string, unknown>>,
      organizationColumns,
    );
  });

  addGlobalOptions(
    program.command('whoami').description('Show the authenticated principal'),
  ).action(async (_options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    const principal = await client.get<Principal>('/v1/me');
    if (json) {
      printJson(principal);
      return;
    }
    console.log(`Kind:          ${principal.kind}`);
    console.log(`Subject:       ${principal.subject}`);
    if (principal.email) console.log(`Email:         ${principal.email}`);
    if (principal.role) console.log(`Role:          ${principal.role}`);
    console.log(`Organizations: ${principal.organizationIds.join(', ') || '(none)'}`);
    console.log(`Scopes:        ${principal.scopes.join(', ') || '(none)'}`);
  });
}
