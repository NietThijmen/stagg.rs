import { error, type RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { workos } from '$lib/server/workos';
import { requireAuth } from '$lib/server/auth';

const ADMIN_ROLES = new Set(['organization_owner', 'organization_admin']);

/**
 * WorkOS is the source of truth for organization membership, but sites and
 * organizations live in Postgres. Re-sync a user's memberships periodically so
 * invited members get access without a dedicated webhook.
 */
const MEMBERSHIP_SYNC_TTL_MS = 60_000;
const membershipSyncedAt = new Map<string, number>();

export interface AuthzMembership {
  organizationId: string;
  role: string;
}

export interface AuthzContext {
  userId: string;
  email: string;
  memberships: AuthzMembership[];
}

export function isAdmin(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

export function organizationIds(context: AuthzContext): string[] {
  return context.memberships.map((membership) => membership.organizationId);
}

export async function requireAuthz(event: RequestEvent): Promise<AuthzContext> {
  const { user } = await requireAuth(event);

  await upsertUser(user);
  await syncMemberships(user.id);

  const memberships = await prisma.membership.findMany({ where: { userId: user.id } });

  return {
    userId: user.id,
    email: user.email,
    memberships: memberships.map((membership) => ({
      organizationId: membership.organizationId,
      role: membership.role,
    })),
  };
}

export async function requireOrganizationAccess(
  event: RequestEvent,
  organizationId: string,
  options: { admin?: boolean } = {},
) {
  const context = await requireAuthz(event);
  const membership = context.memberships.find(
    (candidate) => candidate.organizationId === organizationId,
  );

  if (!membership) {
    throw error(403, 'You do not have access to this organization');
  }
  if (options.admin && !isAdmin(membership.role)) {
    throw error(403, 'You do not have permission to manage this organization');
  }

  return { context, membership };
}

export async function requireSiteAccess(
  event: RequestEvent,
  siteId: string,
  options: { admin?: boolean } = {},
) {
  const context = await requireAuthz(event);
  const site = await prisma.site.findUnique({ where: { id: siteId } });

  if (!site) {
    throw error(404, 'Website not found');
  }

  const membership = context.memberships.find(
    (candidate) => candidate.organizationId === site.organizationId,
  );

  // Treat sites in other organizations as nonexistent to avoid leaking access.
  if (!membership) {
    throw error(404, 'Website not found');
  }
  if (options.admin && !isAdmin(membership.role)) {
    throw error(403, 'You do not have permission to manage this website');
  }

  return { context, site, membership };
}

async function upsertUser(user: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email, name },
    create: { id: user.id, email: user.email, name },
  });
}

async function syncMemberships(userId: string) {
  const lastSyncedAt = membershipSyncedAt.get(userId) ?? 0;
  if (Date.now() - lastSyncedAt < MEMBERSHIP_SYNC_TTL_MS) {
    return;
  }
  membershipSyncedAt.set(userId, Date.now());

  const memberships = await workos.userManagement.listOrganizationMemberships({ userId });

  for (const membership of memberships.data) {
    if (membership.status && membership.status !== 'active') {
      continue;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: membership.organizationId },
    });

    if (!organization) {
      const workosOrganization = await workos.organizations.getOrganization(
        membership.organizationId,
      );
      await prisma.organization.upsert({
        where: { id: workosOrganization.id },
        update: { name: workosOrganization.name },
        create: {
          id: workosOrganization.id,
          workosId: workosOrganization.id,
          name: workosOrganization.name,
        },
      });
    }

    const role = membership.role ? String(membership.role) : 'developer';

    await prisma.membership.upsert({
      where: {
        userId_organizationId: { userId, organizationId: membership.organizationId },
      },
      update: { role },
      create: {
        userId,
        organizationId: membership.organizationId,
        role,
      },
    });
  }
}
