export interface Organization {
  id: string;
  name: string;
  workosId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  organizationId: string;
  name: string;
  hostname: string;
  previewHostname: string;
  status: string;
  desiredReplicas: number;
  minReplicas: number;
  maxReplicas: number;
  containerConfig: string | null;
  containerConfigSecretName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Destination {
  id: string;
  siteId: string;
  organizationId: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  organizationId: string;
  siteId: string | null;
  type: string;
  status: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Principal {
  kind: string;
  subject: string;
  email?: string;
  organizationIds: string[];
  role?: string;
  permissions: string[];
  scopes: string[];
}

export interface ApiKey {
  id: string;
  name: string;
  owner: { type: string; id: string; organizationId?: string };
  obfuscatedValue: string;
  lastUsedAt: string | null;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  value?: string;
}

export interface SiteAnalytics {
  siteId: string;
  from: string;
  to: string;
  total: number;
  errors: number;
  errorRate: number;
  p95Latency: number;
  points: Array<{ bucket: string; total: number; errors: number; p95Latency: number }>;
}

export interface Trace {
  traceId: string;
  lastSeen: string;
  spans: number;
  maxDurationMs: number;
  errors: number;
}

export interface TraceSpan {
  spanId: string;
  parentSpanId: string;
  name: string;
  service: string;
  durationMs: number;
  statusCode: string;
  timestamp: string;
}
