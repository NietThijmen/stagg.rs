import { serve } from '@hono/node-server';
import { loadConfig } from '@staggers/config';
import { initTelemetry } from '@staggers/telemetry';
import { createApp } from './app.js';
import { createDeps } from './deps.js';

const config = loadConfig();

initTelemetry({
  ...config.otel,
  serviceName: config.otel.serviceName ?? 'staggers-api',
});

const app = createApp(createDeps(config));

serve({ fetch: app.fetch, port: config.apiPort }, (info) => {
  console.log(`Stagg.rs API listening on http://localhost:${info.port}`);
  console.log(`OpenAPI spec: http://localhost:${info.port}/openapi.json`);
  console.log(`Docs: http://localhost:${info.port}/docs`);
});
