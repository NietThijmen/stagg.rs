import { z } from 'zod';

const databaseConfig = z.object({
  url: z.string().min(1),
});

const clickhouseConfig = z.object({
  url: z.string().min(1),
  username: z.string().default('default'),
  password: z.string().default(''),
  database: z.string().default('otel'),
});

const kubernetesConfig = z.object({
  // Leave empty to use in-cluster config; set to load kubeconfig for local dev.
  kubeconfig: z.string().optional(),
  namespace: z.string().default('customer-workloads'),
  edgeNamespace: z.string().default('edge-system'),
});

const otelConfig = z.object({
  endpoint: z.string().min(1).default('http://otel-collector.platform-system.svc.cluster.local:4318'),
  serviceName: z.string().min(1).default('staggers-service'),
});

const workosConfig = z.object({
  // Client ID used to verify AuthKit access tokens (JWKS audience).
  clientId: z.string().optional(),
  // Secret API key used to call the WorkOS API (validate API keys, manage orgs).
  apiKey: z.string().optional(),
});

export const appConfig = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  // Port for the public API (kept separate from the dashboard's `port`).
  apiPort: z.coerce.number().int().min(1).max(65535).default(4000),
  database: databaseConfig,
  clickhouse: clickhouseConfig,
  kubernetes: kubernetesConfig,
  otel: otelConfig,
  workos: workosConfig,
  // Base domain used for generated preview hostnames.
  platformDomain: z.string().min(1).default('saas.example'),
  // Container image used for sGTM deployments.
  sgtmImage: z.string().min(1).default('gcr.io/cloud-tagging-10302018/gtm-cloud-image:stable'),
});

export type AppConfig = z.infer<typeof appConfig>;

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  return appConfig.parse({
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    apiPort: env.API_PORT,
    database: {
      url: env.DATABASE_URL,
    },
    clickhouse: {
      url: env.CLICKHOUSE_URL,
      username: env.CLICKHOUSE_USERNAME,
      password: env.CLICKHOUSE_PASSWORD,
      database: env.CLICKHOUSE_DATABASE,
    },
    kubernetes: {
      kubeconfig: env.KUBECONFIG,
      namespace: env.K8S_NAMESPACE,
      edgeNamespace: env.K8S_EDGE_NAMESPACE,
    },
    otel: {
      endpoint: env.OTEL_ENDPOINT,
      serviceName: env.OTEL_SERVICE_NAME,
    },
    workos: {
      clientId: env.WORKOS_CLIENT_ID,
      apiKey: env.WORKOS_API_KEY,
    },
    platformDomain: env.PLATFORM_DOMAIN,
    sgtmImage: env.SGTM_IMAGE,
  });
}
