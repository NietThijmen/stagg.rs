import { describe, expect, it } from 'vitest';
import { parseBearer } from './auth.js';

describe('parseBearer', () => {
  it('extracts the token from a Bearer header', () => {
    expect(parseBearer('Bearer sk_test_123')).toBe('sk_test_123');
    expect(parseBearer('bearer   spaced')).toBe('spaced');
  });

  it('returns null for missing or malformed headers', () => {
    expect(parseBearer(undefined)).toBeNull();
    expect(parseBearer('Basic dXNlcjpwYXNz')).toBeNull();
    expect(parseBearer('Bearer')).toBeNull();
  });
});
