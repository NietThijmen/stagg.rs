import { z } from 'zod';

export const organizationId = z.string().min(1).brand<'OrganizationId'>();
export type OrganizationId = z.infer<typeof organizationId>;

export const siteId = z.string().uuid().brand<'SiteId'>();
export type SiteId = z.infer<typeof siteId>;

export const userId = z.string().min(1).brand<'UserId'>();
export type UserId = z.infer<typeof userId>;

export const role = z.enum(['platform_admin', 'organization_owner', 'organization_admin', 'developer', 'analyst', 'billing_admin']);
export type Role = z.infer<typeof role>;

export const membership = z.object({
  userId: userId,
  organizationId: organizationId,
  role: role,
});
export type Membership = z.infer<typeof membership>;
