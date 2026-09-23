import type { KubernetesObject } from '@kubernetes/client-node';

/**
 * A rendered manifest. `KubernetesObject` only models apiVersion/kind/metadata,
 * so an index signature is added to allow arbitrary resource bodies.
 */
export type SiteManifest = KubernetesObject & Record<string, unknown>;

export const MANAGED_BY = 'staggers-reconciler';

/** Shared server-side apply field manager for every platform-owned object. */
export const FIELD_MANAGER = 'staggers-platform';

export const SGTM_PORT = 8080;

export interface SiteManifestInput {
  site: {
    id: string;
    hostname: string;
    previewHostname: string;
    desiredReplicas: number;
    minReplicas: number;
    maxReplicas: number;
    containerConfigSecretName?: string | null;
  };
  namespace: string;
  edgeNamespace: string;
  image: string;
  /** Raw GTM container config. When set, a Secret is emitted with this value. */
  containerConfig?: string;
  /** Public gateway name in the edge namespace. */
  gatewayName?: string;
  gatewaySectionName?: string;
  egressService?: string;
  egressPort?: number;
  otelCollectorNamespace?: string;
}

export interface SiteManifestNames {
  name: string;
  secretName: string;
  serviceAccountName: string;
}

/** Build the DNS-1123 name prefix used for every resource belonging to a site. */
export function siteResourceName(siteId: string): string {
  return toDnsName(`sgtm-${siteId}`);
}

/**
 * Namespace that isolates a single site's workloads (sGTM plus its egress
 * proxy). Derived from the base namespace so all tenant namespaces share the
 * configured prefix.
 */
export function siteNamespace(siteId: string, baseNamespace: string): string {
  return toDnsName(`${baseNamespace}-${siteId}`);
}

/** Namespace manifest that owns a site's sGTM and egress resources. */
export function buildSiteNamespace(siteId: string, namespace: string): SiteManifest {
  return {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: namespace,
      labels: {
        'app.kubernetes.io/part-of': 'staggers-platform',
        'app.kubernetes.io/managed-by': MANAGED_BY,
        'staggers.io/site-id': siteId,
      },
    },
  };
}

export function siteManifestNames(input: SiteManifestInput): SiteManifestNames {
  const name = siteResourceName(input.site.id);
  return {
    name,
    secretName: input.site.containerConfigSecretName ?? `${name}-config`,
    serviceAccountName: name,
  };
}

export interface EgressResourceNames {
  name: string;
  deploymentName: string;
  configMapName: string;
  serviceName: string;
}

/** Per-site egress proxy resources, co-located with the site in its namespace. */
export function egressResourceNames(siteId: string): EgressResourceNames {
  const name = `${siteResourceName(siteId)}-egress`;
  return {
    name,
    deploymentName: name,
    configMapName: `${name}-config`,
    serviceName: name,
  };
}

/** Selector shared by a site's egress Deployment, Service and NetworkPolicy. */
export function egressSelectorLabels(siteId: string): Record<string, string> {
  return {
    'app.kubernetes.io/name': 'egress-envoy',
    'staggers.io/site-id': siteId,
  };
}

/**
 * Generate the full set of Kubernetes manifests for a single site. The output
 * mirrors k8s/sgtm/03-example-deployment.yaml and 04-network-policy.yaml with
 * site-specific values substituted.
 */
export function buildSiteManifests(input: SiteManifestInput): SiteManifest[] {
  const { site, namespace } = input;
  const { name, secretName, serviceAccountName } = siteManifestNames(input);

  const labels = baseLabels(site.id);
  const selectorLabels = {
    'app.kubernetes.io/name': 'sgtm',
    'staggers.io/site-id': site.id,
  };

  const manifests: SiteManifest[] = [buildSiteNamespace(site.id, namespace)];

  if (input.containerConfig !== undefined) {
    manifests.push(
      buildContainerConfigSecret({
        siteId: site.id,
        namespace,
        secretName,
        containerConfig: input.containerConfig,
      }),
    );
  }

  manifests.push(
    serviceAccount({ name: serviceAccountName, namespace, labels }),
    service({ name, namespace, labels, selectorLabels }),
    deployment({
      input,
      name,
      secretName,
      serviceAccountName,
      labels,
      selectorLabels,
    }),
    horizontalPodAutoscaler({ input, name, namespace, labels }),
    httpRoute({ input, name, labels }),
    networkPolicy({ input, name, selectorLabels }),
    resourceQuota({ input, name }),
    limitRange({ input, name }),
  );

  return manifests;
}

/**
 * Secret holding the GTM server container config consumed by the sGTM image.
 * The worker writes this once a container has been provisioned.
 */
export function buildContainerConfigSecret(input: {
  siteId: string;
  namespace: string;
  containerConfig: string;
  secretName?: string;
}): SiteManifest {
  const name = input.secretName ?? `${siteResourceName(input.siteId)}-config`;
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name, namespace: input.namespace, labels: baseLabels(input.siteId) },
    type: 'Opaque',
    stringData: { 'container-config': input.containerConfig },
  };
}

/**
 * Header-only reference to the container config Secret, used to delete it
 * without needing to know (or overwrite) its contents.
 */
export function containerConfigSecretRef(input: {
  siteId: string;
  namespace: string;
  secretName?: string;
}): SiteManifest {
  const name = input.secretName ?? `${siteResourceName(input.siteId)}-config`;
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name, namespace: input.namespace },
  };
}

function serviceAccount(args: {
  name: string;
  namespace: string;
  labels: Record<string, string>;
}): SiteManifest {
  const { name, namespace, labels } = args;
  return {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: { name, namespace, labels },
    automountServiceAccountToken: false,
  };
}

function service(args: {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  selectorLabels: Record<string, string>;
}): SiteManifest {
  const { name, namespace, labels, selectorLabels } = args;
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name, namespace, labels },
    spec: {
      type: 'ClusterIP',
      selector: selectorLabels,
      ports: [
        { name: 'http', port: SGTM_PORT, targetPort: 'http', protocol: 'TCP' },
      ],
    },
  };
}

function deployment(args: {
  input: SiteManifestInput;
  name: string;
  secretName: string;
  serviceAccountName: string;
  labels: Record<string, string>;
  selectorLabels: Record<string, string>;
}): SiteManifest {
  const { input, name, secretName, serviceAccountName, labels, selectorLabels } = args;
  const { site, namespace } = input;

  const egressService =
    input.egressService ??
    `${egressResourceNames(site.id).serviceName}.${namespace}.svc.cluster.local`;
  const egressPort = input.egressPort ?? SGTM_PORT;
  const egressUrl = `http://${egressService}:${egressPort}`;
  const previewServerUrl = `https://${site.previewHostname}`;

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace,
      labels: { ...labels, 'staggers.io/hostname': toLabelValue(site.hostname) },
    },
    spec: {
      replicas: site.desiredReplicas,
      strategy: {
        type: 'RollingUpdate',
        rollingUpdate: { maxSurge: 1, maxUnavailable: 0 },
      },
      selector: { matchLabels: selectorLabels },
      template: {
        metadata: {
          labels: { ...labels, 'app.kubernetes.io/name': 'sgtm' },
          annotations: {
            'prometheus.io/scrape': 'true',
            'prometheus.io/port': String(SGTM_PORT),
            'prometheus.io/path': '/metrics',
          },
        },
        spec: {
          serviceAccountName,
          automountServiceAccountToken: false,
          securityContext: { runAsNonRoot: true, runAsUser: 1000, fsGroup: 1000 },
          containers: [
            {
              name: 'sgtm',
              image: input.image,
              imagePullPolicy: 'IfNotPresent',
              ports: [{ name: 'http', containerPort: SGTM_PORT, protocol: 'TCP' }],
              env: [
                {
                  name: 'CONTAINER_CONFIG',
                  valueFrom: { secretKeyRef: { name: secretName, key: 'container-config' } },
                },
                { name: 'PREVIEW_SERVER_URL', value: previewServerUrl },
                { name: 'HTTP_PROXY', value: egressUrl },
                { name: 'HTTPS_PROXY', value: egressUrl },
                {
                  name: 'NO_PROXY',
                  value: 'localhost,127.0.0.1,*.svc.cluster.local',
                },
              ],
              resources: {
                requests: { cpu: '1', memory: '512Mi' },
                limits: { cpu: '1', memory: '1Gi' },
              },
              livenessProbe: {
                httpGet: { path: '/healthy', port: 'http' },
                initialDelaySeconds: 10,
                periodSeconds: 10,
              },
              readinessProbe: {
                httpGet: { path: '/healthy', port: 'http' },
                initialDelaySeconds: 5,
                periodSeconds: 5,
              },
              volumeMounts: [{ name: 'tmp', mountPath: '/tmp' }],
            },
          ],
          volumes: [{ name: 'tmp', emptyDir: {} }],
        },
      },
    },
  };
}

function horizontalPodAutoscaler(args: {
  input: SiteManifestInput;
  name: string;
  namespace: string;
  labels: Record<string, string>;
}): SiteManifest {
  const { input, name, namespace, labels } = args;
  const { site } = input;
  return {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata: { name, namespace, labels },
    spec: {
      scaleTargetRef: { apiVersion: 'apps/v1', kind: 'Deployment', name },
      minReplicas: site.minReplicas,
      maxReplicas: site.maxReplicas,
      metrics: [
        {
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: { type: 'Utilization', averageUtilization: 70 },
          },
        },
      ],
      behavior: {
        scaleUp: {
          stabilizationWindowSeconds: 60,
          policies: [{ type: 'Percent', value: 100, periodSeconds: 60 }],
        },
        scaleDown: {
          stabilizationWindowSeconds: 300,
          policies: [{ type: 'Percent', value: 10, periodSeconds: 60 }],
        },
      },
    },
  };
}

function httpRoute(args: {
  input: SiteManifestInput;
  name: string;
  labels: Record<string, string>;
}): SiteManifest {
  const { input, name, labels } = args;
  const { site, namespace } = input;
  const gatewayName = input.gatewayName ?? 'public-gateway';
  return {
    apiVersion: 'gateway.networking.k8s.io/v1',
    kind: 'HTTPRoute',
    metadata: { name, namespace, labels },
    spec: {
      parentRefs: [
        {
          name: gatewayName,
          namespace: input.edgeNamespace,
          ...(input.gatewaySectionName ? { sectionName: input.gatewaySectionName } : {}),
        },
      ],
      hostnames: [site.hostname],
      rules: [
        {
          backendRefs: [{ name, namespace, port: SGTM_PORT }],
        },
      ],
    },
  };
}

function networkPolicy(args: {
  input: SiteManifestInput;
  name: string;
  selectorLabels: Record<string, string>;
}): SiteManifest {
  const { input, name, selectorLabels } = args;
  const { namespace } = input;
  const egressPort = input.egressPort ?? SGTM_PORT;
  const otelNamespace = input.otelCollectorNamespace ?? 'platform-system';
  return {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'NetworkPolicy',
    metadata: { name, namespace },
    spec: {
      podSelector: { matchLabels: selectorLabels },
      policyTypes: ['Ingress', 'Egress'],
      ingress: [
        {
          from: [
            {
              namespaceSelector: {
                matchLabels: { 'kubernetes.io/metadata.name': input.edgeNamespace },
              },
            },
          ],
          ports: [{ protocol: 'TCP', port: SGTM_PORT }],
        },
      ],
      egress: [
        {
          to: [
            {
              namespaceSelector: {},
              podSelector: { matchLabels: { 'k8s-app': 'kube-dns' } },
            },
          ],
          ports: [{ protocol: 'UDP', port: 53 }],
        },
        {
          to: [
            {
              podSelector: { matchLabels: egressSelectorLabels(input.site.id) },
            },
          ],
          ports: [{ protocol: 'TCP', port: egressPort }],
        },
        {
          to: [
            {
              namespaceSelector: {
                matchLabels: { 'kubernetes.io/metadata.name': otelNamespace },
              },
              podSelector: { matchLabels: { 'app.kubernetes.io/name': 'otel-collector' } },
            },
          ],
          ports: [
            { protocol: 'TCP', port: 4317 },
            { protocol: 'TCP', port: 4318 },
          ],
        },
      ],
    },
  };
}

function resourceQuota(args: { input: SiteManifestInput; name: string }): SiteManifest {
  const { input, name } = args;
  return {
    apiVersion: 'v1',
    kind: 'ResourceQuota',
    metadata: { name, namespace: input.namespace },
    spec: {
      hard: {
        'requests.cpu': '5',
        'requests.memory': '6Gi',
        'limits.cpu': '10',
        'limits.memory': '12Gi',
        pods: '15',
      },
    },
  };
}

function limitRange(args: { input: SiteManifestInput; name: string }): SiteManifest {
  const { input, name } = args;
  return {
    apiVersion: 'v1',
    kind: 'LimitRange',
    metadata: { name, namespace: input.namespace },
    spec: {
      limits: [
        {
          type: 'Container',
          default: { cpu: '1', memory: '1Gi' },
          defaultRequest: { cpu: '1', memory: '512Mi' },
        },
      ],
    },
  };
}

function baseLabels(siteId: string): Record<string, string> {
  return {
    'app.kubernetes.io/name': 'sgtm',
    'app.kubernetes.io/part-of': 'staggers-platform',
    'app.kubernetes.io/managed-by': MANAGED_BY,
    'staggers.io/site-id': siteId,
  };
}

function toDnsName(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized.slice(0, 63);
}

function toLabelValue(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');
  return sanitized.slice(0, 63) || 'unknown';
}
