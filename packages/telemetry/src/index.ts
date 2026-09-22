import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export interface TelemetryConfig {
  endpoint: string;
  serviceName: string;
}

export function initTelemetry(config: TelemetryConfig): NodeSDK {
  const exporter = new OTLPTraceExporter({
    url: config.endpoint,
  });

  const sdk = new NodeSDK({
    serviceName: config.serviceName,
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  return sdk;
}

export * from '@opentelemetry/api';
