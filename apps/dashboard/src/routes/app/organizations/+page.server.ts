import { prisma } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { user } = await requireAuth(event);

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { organization: { name: 'asc' } },
  });

  return {
    organizations: memberships.map((m) => m.organization),
  };
};
