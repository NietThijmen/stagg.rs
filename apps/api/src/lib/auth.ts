import type { WorkOS } from '@workos-inc/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { resolveScopes, type Scope } from './scopes.js';

export interface Principal {
  kind: 'api_key' | 'user';
  subject: string;
  email?: string;
  organizationIds: string[];
  role?: string;
  permissions: string[];
  scopes: Scope[];
}

export interface AuthenticatorDeps {
  workos: WorkOS;
  clientId: string;
}

export function parseBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function looksLikeJwt(token: string): boolean {
  return token.split('.').length === 3;
}

export function createAuthenticator({ workos, clientId }: AuthenticatorDeps) {
  const jwks = createRemoteJWKSet(new URL(workos.userManagement.getJwksUrl(clientId)), {
    cooldownDuration: 300_000,
  });

  async function authenticateJwt(token: string): Promise<Principal | null> {
    const { payload } = await jwtVerify(token, jwks, { audience: clientId });

    const subject = typeof payload.sub === 'string' ? payload.sub : null;
    if (!subject) return null;

    const role = typeof payload.role === 'string' ? payload.role : undefined;
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.filter((value): value is string => typeof value === 'string')
      : [];

    const organizationIds =
      typeof payload.org_id === 'string' && payload.org_id
        ? [payload.org_id]
        : await listUserOrganizationIds(workos, subject);

    if (organizationIds.length === 0) return null;

    return {
      kind: 'user',
      subject,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      organizationIds,
      role,
      permissions,
      scopes: resolveScopes({ kind: 'user', role, permissions }),
    };
  }

  async function authenticateApiKey(token: string): Promise<Principal | null> {
    const { apiKey } = await workos.apiKeys.createValidation({ value: token });
    if (!apiKey) return null;

    const organizationIds =
      apiKey.owner.type === 'organization'
        ? [apiKey.owner.id]
        : [apiKey.owner.organizationId];

    return {
      kind: 'api_key',
      subject: apiKey.id,
      organizationIds,
      permissions: apiKey.permissions,
      scopes: resolveScopes({ kind: 'api_key', permissions: apiKey.permissions }),
    };
  }

  return async function authenticate(token: string): Promise<Principal | null> {
    if (looksLikeJwt(token)) {
      const principal = await authenticateJwt(token).catch(() => null);
      if (principal) return principal;
    }
    return authenticateApiKey(token).catch(() => null);
  };
}

async function listUserOrganizationIds(workos: WorkOS, userId: string): Promise<string[]> {
  const memberships = await workos.userManagement.listOrganizationMemberships({ userId });
  return memberships.data
    .filter((membership) => !membership.status || membership.status === 'active')
    .map((membership) => membership.organizationId);
}
