import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { AppEnv } from '../types.js';
import {
  getDeps,
  getPrincipal,
  requireOrganizationAccess,
  requireScope,
} from '../lib/access.js';
import { notFound } from '../lib/errors.js';
import { toApiKey, toCreatedApiKey } from '../lib/serializers.js';
import {
  ApiKeySchema,
  CreateApiKeySchema,
  CreatedApiKeySchema,
  ErrorResponse,
} from '../schemas.js';

const listApiKeysRoute = createRoute({
  method: 'get',
  path: '/organizations/{organizationId}/api-keys',
  tags: ['Tokens'],
  summary: 'List WorkOS API keys for an organization',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ organizationId: z.string() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(ApiKeySchema) } },
      description: 'Organization API keys',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const createApiKeyRoute = createRoute({
  method: 'post',
  path: '/organizations/{organizationId}/api-keys',
  tags: ['Tokens'],
  summary: 'Create a WorkOS API key for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ organizationId: z.string() }),
    body: { content: { 'application/json': { schema: CreateApiKeySchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: CreatedApiKeySchema } },
      description: 'API key created. The value is only returned once.',
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

const revokeApiKeyRoute = createRoute({
  method: 'delete',
  path: '/api-keys/{apiKeyId}',
  tags: ['Tokens'],
  summary: 'Revoke a WorkOS API key',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ apiKeyId: z.string() }) },
  responses: {
    204: { description: 'API key revoked' },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
});

export function createTokensRouter() {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(listApiKeysRoute, async (c) => {
    const { organizationId } = c.req.valid('param');
    requireOrganizationAccess(c, organizationId, 'tokens:read');
    const deps = getDeps(c);

    const keys = await deps.workos.apiKeys.listOrganizationApiKeys({ organizationId });
    return c.json(keys.data.map(toApiKey), 200);
  });

  router.openapi(createApiKeyRoute, async (c) => {
    const { organizationId } = c.req.valid('param');
    const body = c.req.valid('json');
    requireOrganizationAccess(c, organizationId, 'tokens:write');
    const deps = getDeps(c);

    const apiKey = await deps.workos.apiKeys.createOrganizationApiKey({
      organizationId,
      name: body.name,
      permissions: body.permissions,
    });

    return c.json(toCreatedApiKey(apiKey), 201);
  });

  router.openapi(revokeApiKeyRoute, async (c) => {
    const { apiKeyId } = c.req.valid('param');
    requireScope(c, 'tokens:write');
    const principal = getPrincipal(c);
    const deps = getDeps(c);

    for (const organizationId of principal.organizationIds) {
      const keys = await deps.workos.apiKeys.listOrganizationApiKeys({ organizationId });
      if (keys.data.some((key) => key.id === apiKeyId)) {
        await deps.workos.apiKeys.deleteApiKey(apiKeyId);
        return c.body(null, 204);
      }
    }

    throw notFound('API key not found');
  });

  return router;
}
