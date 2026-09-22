import { error, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { workos } from '$lib/server/workos';
import type { PageServerLoad, Actions } from './$types';

const adminRoles = new Set(['organization_owner', 'organization_admin']);

export const load: PageServerLoad = async (event) => {
  const { user } = await requireAuth(event);
  const organizationId = event.params.organizationId;

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    include: { organization: true },
  });

  if (!membership) {
    throw error(404, 'Organization not found');
  }

    const [members, invitations] = await Promise.all([
      prisma.membership.findMany({
        where: { organizationId },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      workos.userManagement.listInvitations({ organizationId }),
    ]);

    return {
      organization: membership.organization,
      members,
      invitations: invitations.data.filter((i) => i.state === 'pending'),
      isAdmin: adminRoles.has(membership.role),
    };
};

export const actions: Actions = {
  invite: async (event) => {
    const { user } = await requireAuth(event);
    const organizationId = event.params.organizationId;

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });

    if (!membership || !adminRoles.has(membership.role)) {
      return fail(403, { error: 'You do not have permission to invite members.' });
    }

    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return fail(400, { error: 'A valid email address is required.' });
    }

    try {
      await workos.userManagement.sendInvitation({
        email,
        organizationId,
        inviterUserId: user.id,
        expiresInDays: 7,
      });
    } catch (err) {
      console.error('Failed to send invitation:', err);
      return fail(500, { error: 'Failed to send invitation. Please try again.' });
    }

    return { success: true };
  },
};
