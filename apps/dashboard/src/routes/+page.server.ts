import { authKit } from '@workos/authkit-sveltekit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = await authKit.getUser(event);
	return {
		user,
		signInUrl: user ? null : await authKit.getSignInUrl({ returnTo: '/app/websites' }),
		signUpUrl: user ? null : await authKit.getSignUpUrl({ returnTo: '/app/websites' }),
	};
};
