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

const gtmConfig = z.object({
  // Google service account with access to the GTM account. Leave unset to
  // disable GTM provisioning.
  serviceAccountEmail: z.string().optional(),
  privateKey: z.string().optional(),
  // Default GTM account to create containers in. When unset, the first account
  // visible to the service account is used.
  accountId: z.string().optional(),
});

export const appConfig = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  database: databaseConfig,
  clickhouse: clickhouseConfig,
  kubernetes: kubernetesConfig,
  otel: otelConfig,
  gtm: gtmConfig,
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
    gtm: {
      serviceAccountEmail: env.GTM_SERVICE_ACCOUNT_EMAIL,
      privateKey: env.GTM_SERVICE_ACCOUNT_PRIVATE_KEY,
      accountId: env.GTM_ACCOUNT_ID,
    },
    platformDomain: env.PLATFORM_DOMAIN,
    sgtmImage: env.SGTM_IMAGE,
  });
}
