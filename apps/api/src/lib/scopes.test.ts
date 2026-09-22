import { describe, expect, it } from 'vitest';
import { resolveScopes } from './scopes.js';

describe('resolveScopes', () => {
  it('grants all scopes to API keys without explicit permissions', () => {
    expect(resolveScopes({ kind: 'api_key' })).toContain('sites:write');
  });

  it('grants all scopes when permissions include a wildcard', () => {
    expect(resolveScopes({ kind: 'api_key', permissions: ['*'] })).toContain(
      'tokens:write',
    );
  });

  it('intersects explicit permissions with known scopes', () => {
    expect(
      resolveScopes({ kind: 'api_key', permissions: ['sites:read', 'unknown:scope'] }),
    ).toEqual(['sites:read']);
  });

  it('grants read-only scopes to non-admin users', () => {
    const scopes = resolveScopes({ kind: 'user', role: 'developer' });
    expect(scopes).toContain('sites:read');
    expect(scopes).not.toContain('sites:write');
  });

  it('grants all scopes to organization admins', () => {
    expect(resolveScopes({ kind: 'user', role: 'organization_admin' })).toContain(
      'sites:write',
    );
  });
});
