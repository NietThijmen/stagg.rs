import { z } from '@hono/zod-openapi';
import { siteStatus } from '@staggers/contracts';

const isoDate = z.string().openapi({ example: '2026-01-01T00:00:00.000Z' });

export const ErrorSchema = z
  .object({
    error: z.string(),
    message: z.string(),
  })
  .openapi('Error');

export const ErrorResponse = {
  content: { 'application/json': { schema: ErrorSchema } },
  description: 'Error response',
};

export const OrganizationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    workosId: z.string(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi('Organization');

export const SiteSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string(),
    name: z.string(),
    hostname: z.string(),
    previewHostname: z.string(),
    status: siteStatus,
    desiredReplicas: z.number().int(),
    minReplicas: z.number().int(),
    maxReplicas: z.number().int(),
    gtmAccountId: z.string().nullable(),
    gtmContainerId: z.string().nullable(),
    containerConfigSecretName: z.string().nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi('Site');

export const CreateSiteSchema = z
  .object({
    organizationId: z.string().min(1),
    name: z.string().min(1).max(255),
    hostname: z.string().min(1).max(255),
    desiredReplicas: z.number().int().min(1).max(100).optional(),
    minReplicas: z.number().int().min(1).max(100).optional(),
    maxReplicas: z.number().int().min(1).max(100).optional(),
  })
  .openapi('CreateSite');

export const UpdateSiteSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    hostname: z.string().min(1).max(255).optional(),
    desiredReplicas: z.number().int().min(1).max(100).optional(),
    minReplicas: z.number().int().min(1).max(100).optional(),
    maxReplicas: z.number().int().min(1).max(100).optional(),
    status: siteStatus.optional(),
  })
  .openapi('UpdateSite');

export const DestinationSchema = z
  .object({
    id: z.string().uuid(),
    siteId: z.string().uuid(),
    organizationId: z.string(),
    name: z.string(),
    host: z.string(),
    port: z.number().int(),
    protocol: z.enum(['http', 'https']),
    enabled: z.boolean(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi('Destination');

export const CreateDestinationSchema = z
  .object({
    name: z.string().min(1).max(255),
    host: z.string().min(1).max(255),
    port: z.number().int().min(1).max(65535).optional(),
    protocol: z.enum(['http', 'https']).optional(),
    enabled: z.boolean().optional(),
  })
  .openapi('CreateDestination');

export const UpdateDestinationSchema = CreateDestinationSchema.partial().openapi(
  'UpdateDestination',
);

export const JobTypeSchema = z.enum([
  'create_gtm_container',
  'fetch_container_config',
  'sync_egress_config',
  'provision_site',
]);

export const JobSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string(),
    siteId: z.string().uuid().nullable(),
    type: z.string(),
    status: z.string(),
    payload: z.any().nullable(),
    error: z.string().nullable(),
    startedAt: isoDate.nullable(),
    completedAt: isoDate.nullable(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi('ProvisioningJob');

export const CreateJobSchema = z
  .object({
    siteId: z.string().uuid(),
    type: JobTypeSchema,
    payload: z.record(z.unknown()).optional(),
  })
  .openapi('CreateJob');

export const AnalyticsPointSchema = z
  .object({
    bucket: z.string(),
    total: z.number(),
    errors: z.number(),
    p95Latency: z.number(),
  })
  .openapi('AnalyticsPoint');

export const SiteAnalyticsSchema = z
  .object({
    siteId: z.string().uuid(),
    from: isoDate,
    to: isoDate,
    points: z.array(AnalyticsPointSchema),
    total: z.number(),
    errors: z.number(),
    errorRate: z.number(),
    p95Latency: z.number(),
  })
  .openapi('SiteAnalytics');

export const TraceSchema = z
  .object({
    traceId: z.string(),
    lastSeen: z.string(),
    spans: z.number(),
    maxDurationMs: z.number(),
    errors: z.number(),
  })
  .openapi('Trace');

export const TraceSpanSchema = z
  .object({
    spanId: z.string(),
    parentSpanId: z.string(),
    name: z.string(),
    service: z.string(),
    durationMs: z.number(),
    statusCode: z.string(),
    timestamp: z.string(),
  })
  .openapi('TraceSpan');

export const PrincipalSchema = z
  .object({
    kind: z.enum(['api_key', 'user']),
    subject: z.string(),
    email: z.string().optional(),
    organizationIds: z.array(z.string()),
    role: z.string().optional(),
    permissions: z.array(z.string()),
    scopes: z.array(z.string()),
  })
  .openapi('Principal');

export const ApiKeySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    owner: z.object({
      type: z.enum(['organization', 'user']),
      id: z.string(),
      organizationId: z.string().optional(),
    }),
    obfuscatedValue: z.string(),
    lastUsedAt: isoDate.nullable(),
    permissions: z.array(z.string()),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi('ApiKey');

export const CreateApiKeySchema = z
  .object({
    name: z.string().min(1).max(255),
    permissions: z.array(z.string()).optional(),
  })
  .openapi('CreateApiKey');

export const CreatedApiKeySchema = ApiKeySchema.extend({
  value: z.string(),
}).openapi('CreatedApiKey');

export const HealthSchema = z
  .object({
    status: z.literal('ok'),
    version: z.string(),
  })
  .openapi('Health');

export type OrganizationDto = z.infer<typeof OrganizationSchema>;
export type SiteDto = z.infer<typeof SiteSchema>;
export type DestinationDto = z.infer<typeof DestinationSchema>;
export type JobDto = z.infer<typeof JobSchema>;
export type SiteAnalyticsDto = z.infer<typeof SiteAnalyticsSchema>;
export type TraceDto = z.infer<typeof TraceSchema>;
export type TraceSpanDto = z.infer<typeof TraceSpanSchema>;
export type PrincipalDto = z.infer<typeof PrincipalSchema>;
export type ApiKeyDto = z.infer<typeof ApiKeySchema>;
export type CreatedApiKeyDto = z.infer<typeof CreatedApiKeySchema>;
