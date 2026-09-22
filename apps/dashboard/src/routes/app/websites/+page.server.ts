import { prisma } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  await requireAuth(event);

  // TODO: filter by the user's active WorkOS organization.
  const sites = await prisma.site.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return { sites };
};
