import { createSign } from 'node:crypto';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
}

export interface AccessTokenProvider {
  getAccessToken(): Promise<string>;
}

/**
 * Minimal service-account OAuth provider. Signs a JWT assertion with the
 * account's private key and exchanges it for an access token, caching the
 * result until shortly before expiry.
 */
export function createAccessTokenProvider(
  credentials: ServiceAccountCredentials,
  scopes: string[],
): AccessTokenProvider {
  let cached: { token: string; expiresAt: number } | null = null;

  return {
    async getAccessToken(): Promise<string> {
      const now = Math.floor(Date.now() / 1000);
      if (cached && cached.expiresAt - 60 > now) {
        return cached.token;
      }

      const assertion = signJwt(credentials, scopes, now);
      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Failed to obtain Google access token (${response.status}): ${detail}`);
      }

      const data = (await response.json()) as { access_token: string; expires_in: number };
      cached = { token: data.access_token, expiresAt: now + data.expires_in };
      return data.access_token;
    },
  };
}

function signJwt(
  credentials: ServiceAccountCredentials,
  scopes: string[],
  issuedAt: number,
): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: scopes.join(' '),
      aud: TOKEN_ENDPOINT,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );

  const signingInput = `${header}.${payload}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(normalizePrivateKey(credentials.privateKey));

  return `${signingInput}.${signature.toString('base64url')}`;
}

function base64url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

/** Env vars commonly carry newlines escaped as literal `\n`. */
function normalizePrivateKey(privateKey: string): string {
  return privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey;
}
