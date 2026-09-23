import { describe, expect, it } from 'vitest';
import {
  buildEgressManifests,
  DEFAULT_EGRESS_HOSTS,
  renderEgressAllowlist,
  renderEgressEnvoyConfig,
  replaceEgressAllowlist,
} from './egress.js';
import { egressResourceNames, type SiteManifest } from './manifests.js';

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

describe('renderEgressEnvoyConfig', () => {
  it('bakes the site id in as a static attribute and allows defaults plus customer hosts', () => {
    const config = renderEgressEnvoyConfig({
      siteId: 'site-123',
      hosts: ['customer.example.com'],
    });

    expect(config).toContain('string_value: "site-123"');
    expect(config).not.toContain('__STAGGERS_SITE_ID__');
    expect(config).not.toContain('__EGRESS_SERVICE_NAME__');
    expect(config).toContain('["customer.example.com"] = true,');
    expect(config).toContain('["www.googletagmanager.com"] = true,');
  });
});

describe('buildEgressManifests', () => {
  const siteId = '11111111-1111-4111-8111-111111111111';
  const names = egressResourceNames(siteId);
  const manifests = buildEgressManifests({
    siteId,
    namespace: 'customer-workloads',
    serviceAccountName: 'sgtm-11111111-1111-4111-8111-111111111111',
    hosts: ['customer.example.com'],
  });

  function find(kind: string): Record<string, any> {
    const manifest = manifests.find((candidate: SiteManifest) => candidate.kind === kind);
    if (!manifest) throw new Error(`No ${kind} manifest generated`);
    return manifest as Record<string, any>;
  }

  it('emits a config, deployment, service and network policy', () => {
    expect(manifests.map((manifest) => manifest.kind).sort()).toEqual(
      ['ConfigMap', 'Deployment', 'NetworkPolicy', 'Service'].sort(),
    );
  });

  it('names the resources per site and wires the config volume', () => {
    const deployment = find('Deployment');
    expect(deployment.metadata.name).toBe(names.deploymentName);
    expect(deployment.spec.template.spec.volumes[0].configMap.name).toBe(names.configMapName);
    expect(deployment.spec.template.spec.serviceAccountName).toBe(
      'sgtm-11111111-1111-4111-8111-111111111111',
    );
  });

  it('selects egress pods by the shared selector labels', () => {
    const selector = {
      'app.kubernetes.io/name': 'egress-envoy',
      'staggers.io/site-id': siteId,
    };
    expect(find('Deployment').spec.selector.matchLabels).toEqual(selector);
    expect(find('Service').spec.selector).toEqual(selector);
    expect(find('NetworkPolicy').spec.podSelector.matchLabels).toEqual(selector);
  });

  it('rolls the deployment when the config changes', () => {
    const other = buildEgressManifests({
      siteId,
      namespace: 'customer-workloads',
      serviceAccountName: 'sgtm-11111111-1111-4111-8111-111111111111',
      hosts: ['different.example.com'],
    });
    const hash = (list: SiteManifest[]) =>
      (list.find((m) => m.kind === 'Deployment') as Record<string, any>).spec.template.metadata
        .annotations['staggers.io/egress-config-hash'];

    expect(hash(manifests)).not.toBe(hash(other));
  });
});
