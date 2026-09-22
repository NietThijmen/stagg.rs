import { KubernetesObjectApi, type KubernetesObject } from '@kubernetes/client-node';
import type { KubernetesClient } from './index.js';
import { FIELD_MANAGER } from './manifests.js';

const APPLY_CONTENT_TYPE = 'application/apply-patch+yaml';

/**
 * Server-side apply a set of manifests. Idempotent: re-running updates objects
 * in place using `fieldManager` so ownership of fields is tracked by the API
 * server.
 */
export async function applyManifests(
  client: KubernetesClient,
  manifests: KubernetesObject[],
  fieldManager: string = FIELD_MANAGER,
): Promise<KubernetesObject[]> {
  const api = KubernetesObjectApi.makeApiClient(client.kc);
  const applied: KubernetesObject[] = [];

  for (const manifest of manifests) {
    const { body } = await api.patch(manifest, undefined, undefined, fieldManager, true, {
      headers: { 'Content-Type': APPLY_CONTENT_TYPE },
    });
    applied.push(body as KubernetesObject);
  }

  return applied;
}

/**
 * Delete a set of manifests, ignoring objects that no longer exist. Deployments
 * use foreground cascading so dependent ReplicaSets and Pods are cleaned up.
 */
export async function deleteManifests(
  client: KubernetesClient,
  manifests: KubernetesObject[],
  propagationPolicy: 'Foreground' | 'Background' | 'Orphan' = 'Foreground',
): Promise<void> {
  const api = KubernetesObjectApi.makeApiClient(client.kc);

  for (const manifest of manifests) {
    try {
      await api.delete(manifest, undefined, undefined, undefined, undefined, propagationPolicy);
    } catch (err) {
      if (isNotFound(err)) continue;
      throw err;
    }
  }
}

function isNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const status = err as { statusCode?: number; response?: { statusCode?: number }; code?: number };
  const code = status.statusCode ?? status.response?.statusCode ?? status.code;
  return code === 404;
}
