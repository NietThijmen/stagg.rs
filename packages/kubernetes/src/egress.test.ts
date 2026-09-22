import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EGRESS_HOSTS,
  renderEgressAllowlist,
  replaceEgressAllowlist,
} from './egress.js';

const ENVOY_CONFIG = `line-before
local allowed = {
  -- BEGIN MANAGED DESTINATIONS
  ["old.example.com"] = true,
  -- END MANAGED DESTINATIONS
}
line-after`;

describe('renderEgressAllowlist', () => {
  it('sorts, lowercases and de-duplicates hosts', () => {
    const rendered = renderEgressAllowlist(['B.example.com', 'a.example.com', 'b.example.com']);
    const lines = rendered.split('\n');
    expect(lines[1]).toContain('["a.example.com"]');
    expect(lines[2]).toContain('["b.example.com"]');
    expect(lines.filter((line) => line.includes('b.example.com'))).toHaveLength(1);
  });
});

describe('replaceEgressAllowlist', () => {
  it('replaces the block between the markers and preserves the rest', () => {
    const updated = replaceEgressAllowlist(ENVOY_CONFIG, ['new.example.com']);

    expect(updated).toContain('line-before');
    expect(updated).toContain('line-after');
    expect(updated).not.toContain('old.example.com');
    expect(updated).toContain('["new.example.com"] = true,');
    expect(updated).toContain('-- BEGIN MANAGED DESTINATIONS');
    expect(updated).toContain('-- END MANAGED DESTINATIONS');
  });

  it('throws when the markers are missing', () => {
    expect(() => replaceEgressAllowlist('no markers here', [])).toThrow(/markers/i);
  });
});

describe('DEFAULT_EGRESS_HOSTS', () => {
  it('includes the Google endpoints sGTM needs', () => {
    expect(DEFAULT_EGRESS_HOSTS).toContain('www.google-analytics.com');
    expect(DEFAULT_EGRESS_HOSTS).toContain('www.googletagmanager.com');
  });
});
