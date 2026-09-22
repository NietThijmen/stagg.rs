import { z } from 'zod';
import { organizationId, siteId } from './identity.js';

export const siteStatus = z.enum([
  'pending',
  'provisioning',
  'ready',
  'degraded',
  'failed',
  'deleting',
]);
export type SiteStatus = z.infer<typeof siteStatus>;

export const site = z.object({
  id: siteId,
  organizationId: organizationId,
  name: z.string().min(1).max(255),
  hostname: z.string().min(1).max(255),
  previewHostname: z.string().min(1).max(255),
  gtmAccountId: z.string().min(1).max(255).optional(),
  gtmContainerId: z.string().min(1).max(255).optional(),
  containerConfigSecretName: z.string().min(1).max(255).optional(),
  status: siteStatus,
  desiredReplicas: z.number().int().min(1).max(100).default(3),
  minReplicas: z.number().int().min(1).max(100).default(3),
  maxReplicas: z.number().int().min(1).max(100).default(10),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Site = z.infer<typeof site>;

export const createSiteInput = site
  .pick({
    organizationId: true,
    name: true,
    hostname: true,
    desiredReplicas: true,
    minReplicas: true,
    maxReplicas: true,
  })
  .partial({
    desiredReplicas: true,
    minReplicas: true,
    maxReplicas: true,
  });
export type CreateSiteInput = z.infer<typeof createSiteInput>;

export const updateSiteInput = site
  .pick({
    name: true,
    hostname: true,
    desiredReplicas: true,
    minReplicas: true,
    maxReplicas: true,
    status: true,
  })
  .partial();
export type UpdateSiteInput = z.infer<typeof updateSiteInput>;
