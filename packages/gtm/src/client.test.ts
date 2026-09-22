import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGtmClient } from './client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

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
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') {
      return jsonResponse({ access_token: 'access-token', expires_in: 3600 });
    }
    if (url.endsWith('/accounts') && (init?.method ?? 'GET') === 'GET') {
      return jsonResponse({ account: [{ accountId: '111', name: 'Acme', path: 'accounts/111' }] });
    }
    if (url.endsWith('/accounts/111/containers') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      return jsonResponse({
        accountId: '111',
        containerId: '222',
        name: body.name,
        publicId: 'GTM-ABC123',
        usageContext: body.usageContext,
      });
    }
    if (url.endsWith('/accounts/111/containers/222:snippet')) {
      return jsonResponse({ containerConfig: 'encoded-container-config' });
    }
    throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createGtmClient', () => {
  it('creates a server container with the server usage context', async () => {
    const client = createGtmClient({ ...credentials, accountId: '111' });
    const container = await client.createServerContainer({
      accountId: '111',
      name: 'Acme sGTM',
      domainName: ['metrics.example.com'],
    });

    expect(container.containerId).toBe('222');
    expect(container.publicId).toBe('GTM-ABC123');

    const createCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/accounts/111/containers'),
    );
    expect(createCall).toBeDefined();
    const body = JSON.parse(String(createCall?.[1]?.body));
    expect(body).toMatchObject({
      name: 'Acme sGTM',
      usageContext: ['server'],
      domainName: ['metrics.example.com'],
    });
  });

  it('returns the container config from the snippet endpoint', async () => {
    const client = createGtmClient({ ...credentials, accountId: '111' });
    await expect(client.getContainerConfig('111', '222')).resolves.toBe('encoded-container-config');
  });

  it('throws when a server config is missing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 't', expires_in: 3600 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ snippet: '<script></script>' }));

    const client = createGtmClient({ ...credentials, accountId: '111' });
    await expect(client.getContainerConfig('111', '222')).rejects.toThrow(/container config/i);
  });

  it('resolves the configured account without listing accounts', async () => {
    const client = createGtmClient({ ...credentials, accountId: '999' });
    await expect(client.resolveAccountId()).resolves.toBe('999');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to the first account when none is configured', async () => {
    const client = createGtmClient(credentials);
    await expect(client.resolveAccountId()).resolves.toBe('111');
  });

  it('surfaces API errors with the status code', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 't', expires_in: 3600 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 403));

    const client = createGtmClient({ ...credentials, accountId: '111' });
    await expect(client.listContainers('111')).rejects.toMatchObject({ status: 403 });
  });
});
