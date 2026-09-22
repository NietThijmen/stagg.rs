import type { PrismaClient } from '@staggers/db';
import type { WorkOS } from '@workos-inc/node';

export async function ensureOrganizations(
  prisma: PrismaClient,
  workos: WorkOS,
  organizationIds: string[],
): Promise<void> {
  if (organizationIds.length === 0) return;

  const existing = await prisma.organization.findMany({
    where: { id: { in: organizationIds } },
    select: { id: true },
  });
  const known = new Set(existing.map((organization) => organization.id));

  for (const organizationId of organizationIds) {
    if (known.has(organizationId)) continue;

    try {
      const organization = await workos.organizations.getOrganization(organizationId);
      await prisma.organization.upsert({
        where: { id: organization.id },
        update: { name: organization.name },
        create: {
          id: organization.id,
          workosId: organization.id,
          name: organization.name,
        },
      });
    } catch {
      continue;
    }
  }
}
