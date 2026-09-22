import { WorkOS } from '@workos-inc/node';
import { env } from '$env/dynamic/private';

export const workos = new WorkOS(env.WORKOS_API_KEY);
