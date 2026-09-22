import { Command } from 'commander';
import { configPath, readConfig, writeConfig } from '../config.js';
import { printJson } from '../output.js';

function mask(token: string | undefined): string {
  if (!token) return '(unset)';
  if (token.length <= 8) return '********';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export function registerConfig(program: Command): void {
  const config = program.command('config').description('Manage CLI configuration');

  config
    .command('show')
    .description('Show the current CLI configuration')
    .option('--json', 'Output raw JSON')
    .action((options: { json?: boolean }) => {
      const current = readConfig();
      const masked = { ...current, token: mask(current.token) };

      if (options.json) {
        printJson(masked);
        return;
      }
      console.log(`Config: ${configPath()}`);
      console.log(`API URL: ${current.apiUrl ?? '(default)'}`);
      console.log(`Token:   ${masked.token}`);
    });

  config
    .command('set')
    .description('Set CLI configuration values')
    .option('--api-url <url>', 'API base URL')
    .option('--token <token>', 'WorkOS API key or AuthKit access token')
    .action((options: { apiUrl?: string; token?: string }) => {
      if (options.apiUrl === undefined && options.token === undefined) {
        throw new Error('Provide --api-url and/or --token');
      }

      const current = readConfig();
      const next = { ...current };
      if (options.apiUrl !== undefined) next.apiUrl = options.apiUrl;
      if (options.token !== undefined) next.token = options.token;

      writeConfig(next);
      console.log(`Updated ${configPath()}`);
    });

  config
    .command('path')
    .description('Print the config file path')
    .action(() => {
      console.log(configPath());
    });
}
