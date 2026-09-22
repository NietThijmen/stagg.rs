import { configureAuthKit, authKitHandle } from '@workos/authkit-sveltekit';
import { env } from '$env/dynamic/private';

function requiredEnv(name: keyof typeof env): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(name)}`);
  }
  return value;
}

configureAuthKit({
  clientId: requiredEnv('WORKOS_CLIENT_ID'),
  apiKey: requiredEnv('WORKOS_API_KEY'),
  redirectUri: requiredEnv('WORKOS_REDIRECT_URI'),
  cookiePassword: requiredEnv('WORKOS_COOKIE_PASSWORD')
});

export const handle = authKitHandle();
