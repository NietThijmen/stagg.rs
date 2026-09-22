import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  await requireAuth(event);

  const site = await prisma.site.findUnique({
    where: { id: event.params.websiteId },
    include: {
      deployments: { orderBy: { startedAt: 'desc' }, take: 5 },
      destinations: true,
    },
  });

  if (!site) {
    throw error(404, 'Website not found');
  }

  return { site };
};
