import { z } from 'zod';
import { siteId } from './identity.js';

export const deploymentStatus = z.enum([
  'pending',
  'in_progress',
  'ready',
  'failed',
  'rolling_back',
]);
export type DeploymentStatus = z.infer<typeof deploymentStatus>;

export const siteDeployment = z.object({
  id: z.string().uuid(),
  siteId: siteId,
  revision: z.string().min(1),
  image: z.string().min(1),
  status: deploymentStatus,
  observedGeneration: z.number().int().nonnegative().default(0),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});
export type SiteDeployment = z.infer<typeof siteDeployment>;

export const downstreamDestination = z.object({
  id: z.string().uuid(),
  siteId: siteId,
  name: z.string().min(1).max(255),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).default(443),
  protocol: z.enum(['https', 'http']).default('https'),
  enabled: z.boolean().default(true),
});
export type DownstreamDestination = z.infer<typeof downstreamDestination>;
