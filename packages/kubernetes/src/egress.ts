import type { KubernetesClient } from './index.js';
import { applyManifests } from './apply.js';
import type { SiteManifest } from './manifests.js';

const BEGIN_MARKER = '-- BEGIN MANAGED DESTINATIONS';
const END_MARKER = '-- END MANAGED DESTINATIONS';

/**
 * Destinations every sGTM container needs regardless of customer config.
 * Customer destinations are appended from the database.
 */
export const DEFAULT_EGRESS_HOSTS = [
  'www.google-analytics.com',
  'region1.google-analytics.com',
  'region2.google-analytics.com',
  'www.googleadservices.com',
  'googleads.g.doubleclick.net',
  'www.googletagmanager.com',
  'fonts.gstatic.com',
];

export function renderEgressAllowlist(hosts: string[]): string {
  const normalized = [...new Set(hosts.map((host) => host.trim().toLowerCase()))]
    .filter(Boolean)
    .sort();

  return [
    BEGIN_MARKER,
    ...normalized.map((host) => `                                ["${host}"] = true,`),
    END_MARKER,
  ].join('\n');
}

export function replaceEgressAllowlist(envoyYaml: string, hosts: string[]): string {
  const start = envoyYaml.indexOf(BEGIN_MARKER);
  const end = envoyYaml.indexOf(END_MARKER);

  if (start === -1 || end === -1 || end < start) {
    throw new Error('Egress allowlist markers not found in Envoy config');
  }

  const before = envoyYaml.slice(0, start);
  const after = envoyYaml.slice(end + END_MARKER.length);
  return `${before}${renderEgressAllowlist(hosts)}${after}`;
}

export interface SyncEgressAllowlistOptions {
  namespace: string;
  hosts: string[];
  configMapName?: string;
  deploymentName?: string;
}

/**
 * Rewrite the egress proxy's destination allowlist from the database and roll
 * the egress deployment so Envoy reloads its static config.
 */
export async function syncEgressAllowlist(
  client: KubernetesClient,
  options: SyncEgressAllowlistOptions,
): Promise<void> {
  const configMapName = options.configMapName ?? 'egress-envoy-config';
  const deploymentName = options.deploymentName ?? 'egress-envoy';

  const { body } = await client.core.readNamespacedConfigMap(configMapName, options.namespace);
  const envoyYaml = body.data?.['envoy.yaml'];
  if (!envoyYaml) {
    throw new Error(`ConfigMap ${configMapName} has no envoy.yaml key`);
  }

  const hosts = [...DEFAULT_EGRESS_HOSTS, ...options.hosts];
  const configMap: SiteManifest = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: configMapName,
      namespace: options.namespace,
      labels: body.metadata?.labels,
    },
    data: { ...body.data, 'envoy.yaml': replaceEgressAllowlist(envoyYaml, hosts) },
  };

  await applyManifests(client, [configMap]);
  await client.apps.patchNamespacedDeployment(deploymentName, options.namespace, {
    spec: {
      template: {
        metadata: {
          annotations: { 'kubectl.kubernetes.io/restartedAt': new Date().toISOString() },
        },
      },
    },
  });
}
