import { authKit } from '@workos/authkit-sveltekit';
import type { RequestEvent } from '@sveltejs/kit';

export async function requireAuth(event: RequestEvent) {
  const user = await authKit.getUser(event);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return { user };
}

export function requireOrganization(event: RequestEvent) {
  const organizationId = event.url.searchParams.get('organizationId') ?? event.locals.organizationId;
  if (!organizationId) {
    throw new Error('Organization required');
  }
  return organizationId;
}
