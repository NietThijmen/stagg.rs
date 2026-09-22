import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  await requireAuth(event);

  // TODO: filter organizations by the current WorkOS user.
  const organizations = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
    take: 100,
  });

  return { organizations };
};

export const actions: Actions = {
  default: async (event) => {
    await requireAuth(event);
    const form = await event.request.formData();

    const name = String(form.get('name') ?? '').trim();
    const hostname = String(form.get('hostname') ?? '').trim().toLowerCase();
    const organizationId = String(form.get('organizationId') ?? '').trim();

    if (!name) return fail(400, { error: 'Name is required' });
    if (!hostname) return fail(400, { error: 'Hostname is required' });
    if (!organizationId) return fail(400, { error: 'Organization is required' });

    const previewHostname = `preview-${crypto.randomUUID().slice(0, 8)}.saas.example`;

    const existing = await prisma.site.findUnique({ where: { hostname } });
    if (existing) {
      return fail(409, { error: 'Hostname is already in use' });
    }

    const site = await prisma.site.create({
      data: {
        organizationId,
        name,
        hostname,
        previewHostname,
        status: 'pending',
      },
    });

    await prisma.provisioningJob.create({
      data: {
        organizationId,
        siteId: site.id,
        type: 'provision_site',
        status: 'pending',
      },
    });

    throw redirect(303, `/app/websites/${site.id}`);
  },
};
