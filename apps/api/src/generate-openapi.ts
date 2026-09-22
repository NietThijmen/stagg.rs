import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp, openApiDocumentConfig } from './app.js';
import type { AppDeps } from './types.js';

const app = createApp(undefined as unknown as AppDeps);
const spec = app.getOpenAPIDocument(openApiDocumentConfig);

const outputPath = resolve(process.cwd(), 'openapi.json');
writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`);

console.log(`Wrote OpenAPI spec to ${outputPath}`);
