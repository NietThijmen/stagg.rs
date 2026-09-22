import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAccessTokenProvider } from './auth.js';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const credentials = {
  clientEmail: 'svc@example.iam.gserviceaccount.com',
  privateKey,
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ access_token: 'token-1', expires_in: 3600 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createAccessTokenProvider', () => {
  it('exchanges a signed JWT assertion for an access token', async () => {
    const provider = createAccessTokenProvider(credentials, ['scope-a', 'scope-b']);
    await expect(provider.getAccessToken()).resolves.toBe('token-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://oauth2.googleapis.com/token');
    const body = new URLSearchParams(String(init?.body));
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');

    const assertion = body.get('assertion');
    expect(assertion?.split('.')).toHaveLength(3);
  });

  it('caches the token until it is close to expiry', async () => {
    const provider = createAccessTokenProvider(credentials, ['scope-a']);
    await provider.getAccessToken();
    await provider.getAccessToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes escaped newlines in the private key', async () => {
    const provider = createAccessTokenProvider(
      { ...credentials, privateKey: privateKey.replace(/\n/g, '\\n') },
      ['scope-a'],
    );
    await expect(provider.getAccessToken()).resolves.toBe('token-1');
  });
});
