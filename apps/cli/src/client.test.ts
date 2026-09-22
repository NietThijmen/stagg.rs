import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('ApiClient', () => {
  it('sends the bearer token and query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 'site-1' }]));
    const client = new ApiClient({
      apiUrl: 'http://localhost:4000/',
      token: 'sk_test',
      fetch: fetchMock,
    });

    const result = await client.get('/v1/sites', { limit: 10, organizationId: undefined });

    expect(result).toEqual([{ id: 'site-1' }]);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('http://localhost:4000/v1/sites?limit=10');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk_test');
  });

  it('throws an ApiError with the server code', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        jsonResponse({ error: 'not_found', message: 'Site not found' }, 404),
      );
    const client = new ApiClient({
      apiUrl: 'http://localhost:4000',
      token: 'sk_test',
      fetch: fetchMock,
    });

    await expect(client.get('/v1/sites/missing')).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
      message: 'Site not found',
    });
    await expect(client.get('/v1/sites/missing')).rejects.toBeInstanceOf(ApiError);
  });

  it('returns undefined for 204 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = new ApiClient({
      apiUrl: 'http://localhost:4000',
      token: 'sk_test',
      fetch: fetchMock,
    });

    await expect(client.delete('/v1/api-keys/key-1')).resolves.toBeUndefined();
  });
});
