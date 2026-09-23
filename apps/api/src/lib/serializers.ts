import type {
  DownstreamDestination,
  Organization,
  ProvisioningJob,
  Site,
} from '@staggers/db';
import type { ApiKey, CreatedApiKey } from '@workos-inc/node';
import type {
  ApiKeyDto,
  CreatedApiKeyDto,
  DestinationDto,
  JobDto,
  OrganizationDto,
  SiteDto,
} from '../schemas.js';

export function toOrganization(organization: Organization): OrganizationDto {
  return {
    id: organization.id,
    name: organization.name,
    workosId: organization.workosId,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

export function toSite(site: Site): SiteDto {
  return {
    id: site.id,
    organizationId: site.organizationId,
    name: site.name,
    hostname: site.hostname,
    previewHostname: site.previewHostname,
    status: site.status,
    desiredReplicas: site.desiredReplicas,
    minReplicas: site.minReplicas,
    maxReplicas: site.maxReplicas,
    containerConfig: site.containerConfig,
    containerConfigSecretName: site.containerConfigSecretName,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}

export function toDestination(destination: DownstreamDestination): DestinationDto {
  return {
    id: destination.id,
    siteId: destination.siteId,
    organizationId: destination.organizationId,
    name: destination.name,
    host: destination.host,
    port: destination.port,
    protocol: destination.protocol === 'http' ? 'http' : 'https',
    enabled: destination.enabled,
    createdAt: destination.createdAt.toISOString(),
    updatedAt: destination.updatedAt.toISOString(),
  };
}

export function toJob(job: ProvisioningJob): JobDto {
  return {
    id: job.id,
    organizationId: job.organizationId,
    siteId: job.siteId,
    type: job.type,
    status: job.status,
    payload: job.payload ?? null,
    error: job.error,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export function toApiKey(apiKey: ApiKey | CreatedApiKey): ApiKeyDto {
  return {
    id: apiKey.id,
    name: apiKey.name,
    owner:
      apiKey.owner.type === 'organization'
        ? { type: 'organization', id: apiKey.owner.id }
        : {
            type: 'user',
            id: apiKey.owner.id,
            organizationId: apiKey.owner.organizationId,
          },
    obfuscatedValue: apiKey.obfuscatedValue,
    lastUsedAt: apiKey.lastUsedAt,
    permissions: apiKey.permissions,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
  };
}

export function toCreatedApiKey(apiKey: CreatedApiKey): CreatedApiKeyDto {
  return { ...toApiKey(apiKey), value: apiKey.value };
}
