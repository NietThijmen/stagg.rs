import type { Context } from 'hono';
import type { Site } from '@staggers/db';
import type { AppDeps, AppEnv } from '../types.js';
import type { Principal } from './auth.js';
import { adminRoles, type Scope } from './scopes.js';
import { forbidden, notFound } from './errors.js';

export function getDeps(c: Context<AppEnv>): AppDeps {
  return c.get('deps');
}

export function getPrincipal(c: Context<AppEnv>): Principal {
  return c.get('principal');
}

export function hasScope(c: Context<AppEnv>, scope: Scope): boolean {
  return getPrincipal(c).scopes.includes(scope);
}

export function requireScope(c: Context<AppEnv>, scope: Scope): void {
  if (!hasScope(c, scope)) {
    throw forbidden(`Missing required scope: ${scope}`);
  }
}

export function isAdminRole(role: string | undefined): boolean {
  return role !== undefined && adminRoles.has(role);
}

export function requireOrganizationAccess(
  c: Context<AppEnv>,
  organizationId: string,
  scope: Scope,
): void {
  requireScope(c, scope);
  if (!getPrincipal(c).organizationIds.includes(organizationId)) {
    throw notFound('Organization not found');
  }
}

export async function requireSiteAccess(
  c: Context<AppEnv>,
  siteId: string,
  scope: Scope,
): Promise<Site> {
  requireScope(c, scope);
  const site = await getDeps(c).prisma.site.findUnique({ where: { id: siteId } });

  if (!site || !getPrincipal(c).organizationIds.includes(site.organizationId)) {
    throw notFound('Site not found');
  }

  return site;
}
