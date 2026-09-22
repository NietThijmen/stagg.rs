import { prisma } from '$lib/server/db';
import { organizationIds, requireAuthz } from '$lib/server/authz';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const context = await requireAuthz(event);

  const sites = await prisma.site.findMany({
    where: { organizationId: { in: organizationIds(context) } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return { sites };
};
