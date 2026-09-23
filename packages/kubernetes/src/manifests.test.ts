import { describe, expect, it } from 'vitest';
import {
  buildSiteManifests,
  siteManifestNames,
  siteNamespace,
  siteResourceName,
  type SiteManifest,
  type SiteManifestInput,
} from './manifests.js';

const input: SiteManifestInput = {
  site: {
    id: '11111111-1111-4111-8111-111111111111',
    hostname: 'metrics.example.com',
    previewHostname: 'preview-abc123.saas.example',
    desiredReplicas: 3,
    minReplicas: 3,
    maxReplicas: 10,
    containerConfigSecretName: null,
  },
  namespace: 'customer-workloads',
  edgeNamespace: 'edge-system',
  image: 'gcr.io/cloud-tagging-10302018/gtm-cloud-image:stable',
};

function find(manifests: SiteManifest[], kind: string) {
  const manifest = manifests.find((candidate) => candidate.kind === kind);
  if (!manifest) throw new Error(`No ${kind} manifest generated`);
  return manifest as Record<string, any>;
}

describe('siteResourceName', () => {
  it('prefixes and sanitizes the site id', () => {
    expect(siteResourceName('Abc_123')).toBe('sgtm-abc-123');
  });
});

describe('siteNamespace', () => {
  it('derives a per-site namespace from the base namespace', () => {
    expect(siteNamespace('Abc_123', 'customer-workloads')).toBe(
      'customer-workloads-abc-123',
    );
  });
});

describe('siteManifestNames', () => {
  it('derives a config secret name from the site', () => {
    const names = siteManifestNames(input);
    expect(names.name).toBe('sgtm-11111111-1111-4111-8111-111111111111');
    expect(names.secretName).toBe(`${names.name}-config`);
  });

  it('honours an explicit container config secret name', () => {
    const names = siteManifestNames({
      ...input,
      site: { ...input.site, containerConfigSecretName: 'my-secret' },
    });
    expect(names.secretName).toBe('my-secret');
  });
});

describe('buildSiteManifests', () => {
  it('generates one manifest per resource kind', () => {
    const manifests = buildSiteManifests(input);
    expect(manifests.map((manifest) => manifest.kind).sort()).toEqual(
      [
        'Deployment',
        'HorizontalPodAutoscaler',
        'HTTPRoute',
        'LimitRange',
        'Namespace',
        'NetworkPolicy',
        'ResourceQuota',
        'Service',
        'ServiceAccount',
      ].sort(),
    );
  });

  it('owns a per-site namespace', () => {
    const namespace = find(buildSiteManifests(input), 'Namespace');
    expect(namespace.metadata.name).toBe('customer-workloads');
    expect(namespace.metadata.labels['staggers.io/site-id']).toBe(input.site.id);
  });

  it('emits a Secret only when a container config is provided', () => {
    expect(buildSiteManifests(input).some((m) => m.kind === 'Secret')).toBe(false);
    const withConfig = buildSiteManifests({ ...input, containerConfig: 'CONFIG' });
    expect(find(withConfig, 'Secret').stringData['container-config']).toBe('CONFIG');
  });

  it('points the container at the config secret and egress proxy', () => {
    const deployment = find(buildSiteManifests(input), 'Deployment');
    const container = deployment.spec.template.spec.containers[0];

    expect(container.env).toContainEqual({
      name: 'CONTAINER_CONFIG',
      valueFrom: {
        secretKeyRef: { name: `${siteResourceName(input.site.id)}-config`, key: 'container-config' },
      },
    });
    expect(container.env).toContainEqual({
      name: 'HTTPS_PROXY',
      value: `http://${siteResourceName(input.site.id)}-egress.customer-workloads.svc.cluster.local:8080`,
    });
    expect(container.env).toContainEqual({
      name: 'PREVIEW_SERVER_URL',
      value: `https://${input.site.previewHostname}`,
    });
  });

  it('scales between the configured replica bounds', () => {
    const hpa = find(buildSiteManifests(input), 'HorizontalPodAutoscaler');
    expect(hpa.spec.minReplicas).toBe(3);
    expect(hpa.spec.maxReplicas).toBe(10);
  });

  it('routes the site hostname to its service', () => {
    const route = find(buildSiteManifests(input), 'HTTPRoute');
    expect(route.spec.hostnames).toEqual(['metrics.example.com']);
    expect(route.spec.parentRefs[0]).toMatchObject({
      name: 'public-gateway',
      namespace: 'edge-system',
    });
    expect(route.spec.rules[0].backendRefs[0]).toMatchObject({
      name: siteResourceName(input.site.id),
      namespace: 'customer-workloads',
      port: 8080,
    });
  });

  it('selects pods with the shared selector labels', () => {
    const manifests = buildSiteManifests(input);
    const service = find(manifests, 'Service');
    const deployment = find(manifests, 'Deployment');

    expect(service.spec.selector).toEqual(deployment.spec.selector.matchLabels);
    expect(service.spec.selector).toMatchObject({
      'app.kubernetes.io/name': 'sgtm',
      'staggers.io/site-id': input.site.id,
    });
  });
});
