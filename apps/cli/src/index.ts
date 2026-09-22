#!/usr/bin/env node
import { Command } from 'commander';
import { ApiError } from './client.js';
import { registerAnalytics } from './commands/analytics.js';
import { registerConfig } from './commands/config.js';
import { registerDestinations } from './commands/destinations.js';
import { registerJobs } from './commands/jobs.js';
import { registerOrganizations } from './commands/organizations.js';
import { registerSites } from './commands/sites.js';
import { registerTokens } from './commands/tokens.js';

const program = new Command();

program
  .name('staggers')
  .description('Command line interface for the Stagg.rs API')
  .version('0.0.1')
  .showHelpAfterError();

registerOrganizations(program);
registerSites(program);
registerDestinations(program);
registerJobs(program);
registerAnalytics(program);
registerTokens(program);
registerConfig(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  if (error instanceof ApiError) {
    console.error(`Error (${error.status} ${error.code}): ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error('Error:', error);
  }
  process.exit(1);
});
