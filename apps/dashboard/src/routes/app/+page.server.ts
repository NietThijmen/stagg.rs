import { authKit } from '@workos/authkit-sveltekit';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	throw redirect(302, '/app/websites');
};

export const actions: Actions = {
	signOut: async (event) => {
		return authKit.signOut(event);
	},
};
