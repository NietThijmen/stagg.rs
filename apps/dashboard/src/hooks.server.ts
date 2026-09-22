import { authKitHandle } from '@workos/authkit-sveltekit';

export const handle = authKitHandle({
  // Configure via environment variables:
  // WORKOS_CLIENT_ID, WORKOS_API_KEY, WORKOS_REDIRECT_URI, WORKOS_COOKIE_PASSWORD
});
