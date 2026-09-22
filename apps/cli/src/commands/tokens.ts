import { Command } from 'commander';
import { addGlobalOptions, resolveContext } from '../context.js';
import { printJson, printTable, type TableColumn } from '../output.js';
import type { ApiKey } from '../types.js';

const apiKeyColumns: TableColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'NAME' },
  { key: 'obfuscatedValue', header: 'VALUE' },
  { key: 'permissions', header: 'PERMISSIONS' },
  { key: 'lastUsedAt', header: 'LAST USED' },
];

export function registerTokens(program: Command): void {
  const tokens = program.command('tokens').description('Manage WorkOS API tokens');

  addGlobalOptions(
    tokens
      .command('list')
      .description('List API keys for an organization')
      .argument('<organizationId>', 'Organization ID'),
  ).action(async (organizationId: string, _options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    const keys = await client.get<ApiKey[]>(
      `/v1/organizations/${organizationId}/api-keys`,
    );
    if (json) {
      printJson(keys);
      return;
    }
    printTable(keys as unknown as Array<Record<string, unknown>>, apiKeyColumns);
  });

  addGlobalOptions(
    tokens
      .command('create')
      .description('Create an API key for an organization')
      .argument('<organizationId>', 'Organization ID')
      .requiredOption('--name <name>', 'Token name')
      .option('--permission <scope...>', 'Permission slugs (repeatable)'),
  ).action(
    async (
      organizationId: string,
      options: { name: string; permission?: string[] },
      command: Command,
    ) => {
      const { client, json } = resolveContext(command);
      const key = await client.post<ApiKey>(
        `/v1/organizations/${organizationId}/api-keys`,
        { name: options.name, permissions: options.permission },
      );

      if (json) {
        printJson(key);
        return;
      }
      console.log(`Created API key ${key.id}`);
      console.log(`Value (store it now, shown only once): ${key.value}`);
    },
  );

  addGlobalOptions(
    tokens
      .command('revoke')
      .description('Revoke an API key')
      .argument('<apiKeyId>', 'API key ID'),
  ).action(async (apiKeyId: string, _options: unknown, command: Command) => {
    const { client, json } = resolveContext(command);
    await client.delete(`/v1/api-keys/${apiKeyId}`);
    if (json) {
      printJson({ revoked: true, apiKeyId });
    } else {
      console.log(`Revoked API key ${apiKeyId}`);
    }
  });
}
