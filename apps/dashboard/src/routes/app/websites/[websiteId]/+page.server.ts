import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireSiteAccess } from '$lib/server/authz';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  const { site } = await requireSiteAccess(event, event.params.websiteId);

  const fullSite = await prisma.site.findUnique({
    where: { id: site.id },
    include: {
      deployments: { orderBy: { startedAt: 'desc' }, take: 5 },
      destinations: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!fullSite) {
    throw error(404, 'Website not found');
  }

  return { site: fullSite };
};

export const actions: Actions = {
  addDestination: async (event) => {
    const { site } = await requireSiteAccess(event, event.params.websiteId, { admin: true });
    const form = await event.request.formData();

    const name = String(form.get('name') ?? '').trim();
    const host = String(form.get('host') ?? '').trim().toLowerCase();
    const port = Number(form.get('port') ?? 443);
    const protocol = String(form.get('protocol') ?? 'https');

    if (!name) return fail(400, { error: 'Name is required' });
    if (!isHostname(host)) return fail(400, { error: 'A valid hostname is required' });
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return fail(400, { error: 'Port must be between 1 and 65535' });
    }
    if (protocol !== 'http' && protocol !== 'https') {
      return fail(400, { error: 'Protocol must be http or https' });
    }

    await prisma.downstreamDestination.create({
      data: {
        siteId: site.id,
        organizationId: site.organizationId,
        name,
        host,
        port,
        protocol,
      },
    });

    await enqueueEgressSync(site.organizationId, site.id);
    return { success: true };
  },

  deleteDestination: async (event) => {
    const { site } = await requireSiteAccess(event, event.params.websiteId, { admin: true });
    const destination = await findDestination(event, site.id);
    if (!destination) return fail(404, { error: 'Destination not found' });

    await prisma.downstreamDestination.delete({ where: { id: destination.id } });
    await enqueueEgressSync(site.organizationId, site.id);
    return { success: true };
  },

  toggleDestination: async (event) => {
    const { site } = await requireSiteAccess(event, event.params.websiteId, { admin: true });
    const destination = await findDestination(event, site.id);
    if (!destination) return fail(404, { error: 'Destination not found' });

    await prisma.downstreamDestination.update({
      where: { id: destination.id },
      data: { enabled: !destination.enabled },
    });

    await enqueueEgressSync(site.organizationId, site.id);
    return { success: true };
  },
};

async function findDestination(event: RequestEvent, siteId: string) {
  const form = await event.request.formData();
  const destinationId = String(form.get('destinationId') ?? '');
  if (!destinationId) return null;

  const destination = await prisma.downstreamDestination.findUnique({
    where: { id: destinationId },
  });

  if (!destination || destination.siteId !== siteId) return null;
  return destination;
}

async function enqueueEgressSync(organizationId: string, siteId: string) {
  await prisma.provisioningJob.create({
    data: { organizationId, siteId, type: 'sync_egress_config', status: 'pending' },
  });
}

function isHostname(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value);
}
