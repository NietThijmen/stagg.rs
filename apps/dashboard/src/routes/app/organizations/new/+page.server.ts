import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { workos } from '$lib/server/workos';
import { ConflictException } from '@workos-inc/node';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  await requireAuth(event);
  return {};
};

export const actions: Actions = {
  default: async (event) => {
    const { user } = await requireAuth(event);
    const form = await event.request.formData();

    const name = String(form.get('name') ?? '').trim();

    if (!name) {
      return fail(400, { error: 'Name is required' });
    }

    let workosOrg = { id: '', name: '' };

    try {
      workosOrg = await workos.organizations.createOrganization({ name });

      await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            id: workosOrg.id,
            workosId: workosOrg.id,
            name: workosOrg.name,
          },
        });

        await tx.user.upsert({
          where: { id: user.id },
          update: {},
          create: {
            id: user.id,
            email: user.email,
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
          },
        });

        await tx.membership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: 'organization_owner',
          },
        });
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        return fail(409, { error: 'An organization with this name already exists.' });
      }

      console.error('Failed to create organization:', error);
      return fail(500, { error: 'Failed to create organization. Please try again.' });
    }

    throw redirect(303, `/app/organizations/${workosOrg.id}`);
  },
};
