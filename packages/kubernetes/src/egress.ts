import {
  egressResourceNames,
  egressSelectorLabels,
  MANAGED_BY,
  SGTM_PORT,
  type SiteManifest,
} from './manifests.js';

const BEGIN_MARKER = '-- BEGIN MANAGED DESTINATIONS';
const END_MARKER = '-- END MANAGED DESTINATIONS';

const SITE_ID_PLACEHOLDER = '__STAGGERS_SITE_ID__';
const SERVICE_NAME_PLACEHOLDER = '__EGRESS_SERVICE_NAME__';

export const DEFAULT_EGRESS_IMAGE = 'envoyproxy/envoy:v1.31-latest';

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

export function renderEgressAllowlist(hosts: string[], indent = ''): string {
  const normalized = [...new Set(hosts.map((host) => host.trim().toLowerCase()))]
    .filter(Boolean)
    .sort();

  return [
    `${indent}${BEGIN_MARKER}`,
    ...normalized.map((host) => `${indent}["${host}"] = true,`),
    `${indent}${END_MARKER}`,
  ].join('\n');
}

export function replaceEgressAllowlist(envoyYaml: string, hosts: string[]): string {
  const start = envoyYaml.indexOf(BEGIN_MARKER);
  const end = envoyYaml.indexOf(END_MARKER);

  if (start === -1 || end === -1 || end < start) {
    throw new Error('Egress allowlist markers not found in Envoy config');
  }

  const lineStart = envoyYaml.lastIndexOf('\n', start) + 1;
  const indent = envoyYaml.slice(lineStart, start);
  const before = envoyYaml.slice(0, lineStart);
  const after = envoyYaml.slice(end + END_MARKER.length);
  return `${before}${renderEgressAllowlist(hosts, indent)}${after}`;
}

/**
 * Render the full Envoy forward-proxy config for a single site. The site id is
 * baked into the access log attributes (and the tracer service name) so egress
 * telemetry is attributed to the customer without relying on a request header.
 */
export function renderEgressEnvoyConfig(input: {
  siteId: string;
  hosts: string[];
  serviceName?: string;
}): string {
  const allowlisted = replaceEgressAllowlist(EGRESS_ENVOY_CONFIG_TEMPLATE, [
    ...DEFAULT_EGRESS_HOSTS,
    ...input.hosts,
  ]);
  const serviceName = input.serviceName ?? `egress-envoy-${input.siteId}`;

  return allowlisted
    .replaceAll(SITE_ID_PLACEHOLDER, input.siteId)
    .replaceAll(SERVICE_NAME_PLACEHOLDER, serviceName);
}

export interface EgressManifestInput {
  siteId: string;
  namespace: string;
  /** ServiceAccount shared with the site's sGTM pods (no API access). */
  serviceAccountName: string;
  /** Customer-specific destinations; defaults are added automatically. */
  hosts: string[];
  otelCollectorNamespace?: string;
  image?: string;
  replicas?: number;
}

/**
 * Generate the per-site egress stack (ConfigMap, Deployment, Service,
 * NetworkPolicy) that sits in front of a site's sGTM pods. Applying a changed
 * ConfigMap rolls the Deployment via the `staggers.io/egress-config-hash`
 * annotation.
 */
export function buildEgressManifests(input: EgressManifestInput): SiteManifest[] {
  const names = egressResourceNames(input.siteId);
  const labels = egressLabels(input.siteId);
  const selectorLabels = egressSelectorLabels(input.siteId);
  const config = renderEgressEnvoyConfig({
    siteId: input.siteId,
    hosts: input.hosts,
    serviceName: names.serviceName,
  });

  return [
    {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: { name: names.configMapName, namespace: input.namespace, labels },
      data: { 'envoy.yaml': config },
    },
    {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: names.deploymentName, namespace: input.namespace, labels },
      spec: {
        replicas: input.replicas ?? 1,
        strategy: {
          type: 'RollingUpdate',
          rollingUpdate: { maxSurge: 1, maxUnavailable: 0 },
        },
        selector: { matchLabels: selectorLabels },
        template: {
          metadata: {
            labels: selectorLabels,
            annotations: {
              'staggers.io/egress-config-hash': configHash(config),
              'prometheus.io/scrape': 'true',
              'prometheus.io/port': '9901',
              'prometheus.io/path': '/stats/prometheus',
            },
          },
          spec: {
            serviceAccountName: input.serviceAccountName,
            automountServiceAccountToken: false,
            containers: [
              {
                name: 'envoy',
                image: input.image ?? DEFAULT_EGRESS_IMAGE,
                imagePullPolicy: 'IfNotPresent',
                args: [
                  '-c',
                  '/etc/envoy/envoy.yaml',
                  '--service-cluster',
                  names.serviceName,
                  '--service-node',
                  names.serviceName,
                ],
                ports: [
                  { name: 'http', containerPort: SGTM_PORT, protocol: 'TCP' },
                  { name: 'admin', containerPort: 9901, protocol: 'TCP' },
                ],
                resources: {
                  requests: { cpu: '100m', memory: '128Mi' },
                  limits: { cpu: '500m', memory: '512Mi' },
                },
                volumeMounts: [{ name: 'config', mountPath: '/etc/envoy', readOnly: true }],
                livenessProbe: {
                  httpGet: { path: '/ready', port: 'admin' },
                  initialDelaySeconds: 10,
                  periodSeconds: 10,
                },
                readinessProbe: {
                  httpGet: { path: '/ready', port: 'admin' },
                  initialDelaySeconds: 5,
                  periodSeconds: 5,
                },
              },
            ],
            volumes: [{ name: 'config', configMap: { name: names.configMapName } }],
          },
        },
      },
    },
    {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: names.serviceName, namespace: input.namespace, labels },
      spec: {
        type: 'ClusterIP',
        selector: selectorLabels,
        ports: [
          { name: 'http', port: SGTM_PORT, targetPort: 'http', protocol: 'TCP' },
          { name: 'admin', port: 9901, targetPort: 'admin', protocol: 'TCP' },
        ],
      },
    },
    {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'NetworkPolicy',
      metadata: { name: names.name, namespace: input.namespace, labels },
      spec: {
        podSelector: { matchLabels: selectorLabels },
        policyTypes: ['Ingress', 'Egress'],
        ingress: [
          {
            from: [
              {
                podSelector: {
                  matchLabels: { 'app.kubernetes.io/name': 'sgtm', 'staggers.io/site-id': input.siteId },
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
                namespaceSelector: {
                  matchLabels: {
                    'kubernetes.io/metadata.name': input.otelCollectorNamespace ?? 'platform-system',
                  },
                },
                podSelector: { matchLabels: { 'app.kubernetes.io/name': 'otel-collector' } },
              },
            ],
            ports: [
              { protocol: 'TCP', port: 4317 },
              { protocol: 'TCP', port: 4318 },
            ],
          },
          // Internet (default allow). Egress is the only per-site workload
          // permitted unrestricted outbound access.
          {},
        ],
      },
    },
  ];
}

function egressLabels(siteId: string): Record<string, string> {
  return {
    ...egressSelectorLabels(siteId),
    'app.kubernetes.io/part-of': 'staggers-platform',
    'app.kubernetes.io/managed-by': MANAGED_BY,
  };
}

/** Small non-cryptographic hash used to trigger rollouts on config changes. */
function configHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const EGRESS_ENVOY_CONFIG_TEMPLATE = `admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

static_resources:
  listeners:
    - name: egress_http
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: egress_http
                codec_type: AUTO
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: forward_proxy
                      domains: ["*"]
                      routes:
                        # HTTPS through an HTTP proxy arrives as CONNECT.
                        # \`connect_config\` terminates the tunnel and forwards
                        # the raw TCP payload (the client's TLS session) upstream.
                        - match:
                            connect_matcher: {}
                          route:
                            cluster: dynamic_forward_proxy_cluster
                            upgrade_configs:
                              - upgrade_type: CONNECT
                                connect_config: {}
                        # Plain HTTP forward proxying.
                        - match:
                            prefix: "/"
                          route:
                            cluster: dynamic_forward_proxy_cluster
                            timeout: 30s
                # Envoy rejects CONNECT with 403 unless the upgrade is enabled.
                upgrade_configs:
                  - upgrade_type: CONNECT
                # OpenTelemetry access logging.
                access_log:
                  - name: envoy.access_loggers.open_telemetry
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.access_loggers.open_telemetry.v3.OpenTelemetryAccessLogConfig
                      common_config:
                        log_name: egress_access_log
                        grpc_service:
                          envoy_grpc:
                            cluster_name: otel_collector_grpc
                        transport_api_version: V3
                      body:
                        string_value: "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %RESPONSE_CODE%"
                      attributes:
                        values:
                          - key: saas.component
                            value:
                              string_value: egress
                          - key: saas.site_id
                            value:
                              string_value: "${SITE_ID_PLACEHOLDER}"
                          - key: downstream.host
                            value:
                              string_value: "%REQ(:AUTHORITY)%"
                          - key: http.status_code
                            value:
                              string_value: "%RESPONSE_CODE%"
                          - key: envoy.response_flags
                            value:
                              string_value: "%RESPONSE_FLAGS%"
                # OpenTelemetry tracing of egress requests.
                tracing:
                  spawn_upstream_span: true
                  provider:
                    name: envoy.tracers.opentelemetry
                    typed_config:
                      "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
                      grpc_service:
                        envoy_grpc:
                          cluster_name: otel_collector_grpc
                      service_name: ${SERVICE_NAME_PLACEHOLDER}
                http_filters:
                  # Enforce destination allowlist before forwarding.
                  - name: envoy.filters.http.lua
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
                      inline_code: |
                        function envoy_on_request(request_handle)
                          local authority = request_handle:headers():get(":authority")
                          if authority == nil then
                            request_handle:respond(
                              {[":status"] = "403"},
                              "missing :authority"
                            )
                            return
                          end
                          -- Strip port if present.
                          local host = authority:match("^([^:]+)")
                          local allowed = {
                                -- BEGIN MANAGED DESTINATIONS
                                -- END MANAGED DESTINATIONS
                          }
                          if not allowed[host] then
                            request_handle:logWarn("egress denied: " .. host)
                            request_handle:respond(
                              {[":status"] = "403"},
                              "destination not allowed"
                            )
                          end
                        end
                  - name: envoy.filters.http.dynamic_forward_proxy
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.dynamic_forward_proxy.v3.FilterConfig
                      dns_cache_config:
                        name: dynamic_forward_proxy_cache_config
                        dns_lookup_family: V4_ONLY
                        max_hosts: 1024
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: dynamic_forward_proxy_cluster
      connect_timeout: 10s
      lb_policy: CLUSTER_PROVIDED
      cluster_type:
        name: envoy.clusters.dynamic_forward_proxy
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.clusters.dynamic_forward_proxy.v3.ClusterConfig
          dns_cache_config:
            name: dynamic_forward_proxy_cache_config
            dns_lookup_family: V4_ONLY
            max_hosts: 1024

    - name: otel_collector_grpc
      connect_timeout: 1s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      typed_extension_protocol_options:
        envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
          "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
          explicit_http_config:
            http2_protocol_options: {}
      load_assignment:
        cluster_name: otel_collector_grpc
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: otel-collector.platform-system.svc.cluster.local
                      port_value: 4317

overload_manager:
  refresh_interval: 0.25s
  resource_monitors:
    - name: envoy.resource_monitors.global_downstream_max_connections
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.resource_monitors.downstream_connections.v3.DownstreamConnectionsConfig
        max_active_downstream_connections: 50000
`;
