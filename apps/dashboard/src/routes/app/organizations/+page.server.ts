import { prisma } from '$lib/server/db';
import { requireAuthz } from '$lib/server/authz';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const context = await requireAuthz(event);

  const memberships = await prisma.membership.findMany({
    where: { userId: context.userId },
    include: { organization: true },
    orderBy: { organization: { name: 'asc' } },
  });

  return {
    organizations: memberships.map((m) => m.organization),
  };
};
