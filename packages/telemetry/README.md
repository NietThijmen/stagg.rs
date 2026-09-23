# @staggers/telemetry

OpenTelemetry SDK setup for Stagg.rs Node.js services.

## What it does

- Initializes a `NodeSDK` with an OTLP HTTP trace exporter.
- Enables Node auto-instrumentations (HTTP, Prisma, etc.).
- Disables the file-system instrumentation to reduce noise.
- Re-exports `@opentelemetry/api` for manual tracing.

## Usage

```typescript
import { initTelemetry } from '@staggers/telemetry';

initTelemetry({
  endpoint: 'http://otel-collector.platform-system.svc.cluster.local:4318',
  serviceName: 'my-service',
});
```

## Scripts

```bash
pnpm build                # compile TypeScript
pnpm dev                  # compile in watch mode
pnpm lint                 # typecheck
```

## Environment variables

Set via `packages/config`:

- `OTEL_ENDPOINT`
- `OTEL_SERVICE_NAME`

## Notes

- Call `initTelemetry` early in the application entry point, before other imports that may need instrumentation.
- The SDK is started automatically; there is no explicit shutdown hook in this package.
