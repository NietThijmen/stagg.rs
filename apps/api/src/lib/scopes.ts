export const scopeNames = [
  'sites:read',
  'sites:write',
  'destinations:read',
  'destinations:write',
  'jobs:read',
  'jobs:write',
  'analytics:read',
  'organizations:read',
  'tokens:read',
  'tokens:write',
] as const;

export type Scope = (typeof scopeNames)[number];

const scopeSet = new Set<string>(scopeNames);

export function isScope(value: string): value is Scope {
  return scopeSet.has(value);
}

export const readScopes: Scope[] = [
  'sites:read',
  'destinations:read',
  'jobs:read',
  'analytics:read',
  'organizations:read',
  'tokens:read',
];

export const adminRoles = new Set([
  'platform_admin',
  'organization_owner',
  'organization_admin',
]);

export interface ScopeInput {
  kind: 'api_key' | 'user';
  role?: string;
  permissions?: string[];
}

export function resolveScopes(input: ScopeInput): Scope[] {
  const permissions = input.permissions ?? [];

  if (permissions.includes('*')) {
    return [...scopeNames];
  }

  const explicit = permissions.filter(isScope);
  if (explicit.length > 0) {
    return [...new Set(explicit)];
  }

  if (input.kind === 'api_key') {
    return [...scopeNames];
  }

  if (input.role && adminRoles.has(input.role)) {
    return [...scopeNames];
  }

  return [...readScopes];
}
