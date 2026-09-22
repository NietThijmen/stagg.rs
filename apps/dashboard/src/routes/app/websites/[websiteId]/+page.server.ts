import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireSiteAccess } from '$lib/server/authz';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { site } = await requireSiteAccess(event, event.params.websiteId);

  const fullSite = await prisma.site.findUnique({
    where: { id: site.id },
    include: {
      deployments: { orderBy: { startedAt: 'desc' }, take: 5 },
      destinations: true,
    },
  });

  if (!fullSite) {
    throw error(404, 'Website not found');
  }

  return { site: fullSite };
};
