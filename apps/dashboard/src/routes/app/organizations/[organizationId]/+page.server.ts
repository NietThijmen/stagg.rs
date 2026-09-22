import { error, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { isAdmin, requireOrganizationAccess } from '$lib/server/authz';
import { workos } from '$lib/server/workos';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  const organizationId = event.params.organizationId;

  const { membership } = await requireOrganizationAccess(event, organizationId);

  const [organization, members, invitations] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.membership.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    }),
    workos.userManagement.listInvitations({ organizationId }),
  ]);

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  return {
    organization,
    members,
    invitations: invitations.data.filter((i) => i.state === 'pending'),
    isAdmin: isAdmin(membership.role),
  };
};

export const actions: Actions = {
  invite: async (event) => {
    const organizationId = event.params.organizationId;

    const { context } = await requireOrganizationAccess(event, organizationId, {
      admin: true,
    });

    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return fail(400, { error: 'A valid email address is required.' });
    }

    try {
      await workos.userManagement.sendInvitation({
        email,
        organizationId,
        inviterUserId: context.userId,
        expiresInDays: 7,
      });
    } catch (err) {
      console.error('Failed to send invitation:', err);
      return fail(500, { error: 'Failed to send invitation. Please try again.' });
    }

    return { success: true };
  },
};
