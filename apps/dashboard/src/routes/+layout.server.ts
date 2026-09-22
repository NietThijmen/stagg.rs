import { authKit } from '@workos/authkit-sveltekit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const user = await authKit.getUser(event);
  return {
    user: user ?? null,
  };
};
