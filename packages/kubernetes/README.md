# @staggers/kubernetes

Kubernetes client helpers and manifest builders for Stagg.rs.

## What it does

- Creates typed Kubernetes API clients from a kubeconfig file or in-cluster config.
- Builds per-site manifests: Secret (container config), ServiceAccount, Service, Deployment, HPA, HTTPRoute, NetworkPolicy, ResourceQuota, and LimitRange.
- Builds the per-site egress stack (ConfigMap, Deployment, Service, NetworkPolicy) with a static `saas.site_id` for telemetry.
- Applies and deletes manifests via server-side apply with the field manager `staggers-platform`.

## Key exports

### Client

```typescript
import { createKubernetesClient } from '@staggers/kubernetes';

const k8s = createKubernetesClient({ kubeconfig: '/path/to/kubeconfig' });
```

### Manifests

- `buildSiteManifests(input)` — renders all manifests for a site.
- `buildContainerConfigSecret(input)` — renders the container-config Secret.
- `siteManifestNames(input)` — returns resource names for a site.
- `containerConfigSecretRef(input)` — returns a Secret reference for deletion.

### Apply / delete

- `applyManifests(client, manifests)` — server-side apply.
- `deleteManifests(client, manifests)` — deletes resources, ignoring 404s.

### Egress

- `buildEgressManifests(input)` — renders a site's egress ConfigMap, Deployment, Service and NetworkPolicy, allowing `DEFAULT_EGRESS_HOSTS` plus the site's destinations.
- `renderEgressEnvoyConfig(input)` — renders the Envoy forward-proxy config with the site id baked in as a static `saas.site_id` attribute.
- `egressResourceNames(siteId)` — returns the per-site egress resource names.

## Scripts

```bash
pnpm build                # compile TypeScript
pnpm dev                  # compile in watch mode
pnpm lint                 # typecheck
pnpm test                 # Vitest unit tests
```

## Notes

- The rendered egress Envoy config must contain the markers `-- BEGIN MANAGED DESTINATIONS` and `-- END MANAGED DESTINATIONS`; never remove them.
- Manifests use the shared field manager `staggers-platform`.
