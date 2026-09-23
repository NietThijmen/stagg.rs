import { describe, expect, it } from 'vitest';
import { loadConfig } from './index.js';

describe('loadConfig', () => {
  it('applies sensible defaults', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://localhost/staggers',
      CLICKHOUSE_URL: 'http://localhost:8123',
    });

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.kubernetes.namespace).toBe('customer-workloads');
    expect(config.kubernetes.edgeNamespace).toBe('edge-system');
    expect(config.clickhouse.database).toBe('otel');
  });

  it('reads overrides from the environment', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://localhost/staggers',
      CLICKHOUSE_URL: 'http://localhost:8123',
      NODE_ENV: 'production',
      PORT: '8080',
      K8S_NAMESPACE: 'sites',
      K8S_EDGE_NAMESPACE: 'edge',
    });

    expect(config.nodeEnv).toBe('production');
    expect(config.port).toBe(8080);
    expect(config.kubernetes.namespace).toBe('sites');
    expect(config.kubernetes.edgeNamespace).toBe('edge');
  });

  it('requires a database url', () => {
    expect(() => loadConfig({})).toThrow();
  });
});
