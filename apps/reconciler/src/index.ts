import { loadConfig } from '@staggers/config';
import { prisma } from '@staggers/db';
import {
  applyManifests,
  buildSiteManifests,
  containerConfigSecretRef,
  createKubernetesClient,
  deleteManifests,
  siteManifestNames,
  type SiteManifestInput,
} from '@staggers/kubernetes';
import { initTelemetry } from '@staggers/telemetry';

const config = loadConfig();
initTelemetry({ ...config.otel, serviceName: config.otel.serviceName ?? 'staggers-reconciler' });

const k8sClient = createKubernetesClient(config.kubernetes);

console.log('Kubernetes cluster:', k8sClient.kc.getCurrentCluster()?.name ?? 'unknown');

function toManifestInput(site: {
  id: string;
  hostname: string;
  previewHostname: string;
  desiredReplicas: number;
  minReplicas: number;
  maxReplicas: number;
  containerConfigSecretName: string | null;
}): SiteManifestInput {
  return {
    site,
    namespace: config.kubernetes.namespace,
    edgeNamespace: config.kubernetes.edgeNamespace,
    image: config.sgtmImage,
  };
}

async function reconcileSite(siteId: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    console.log(`Site ${siteId} not found, skipping`);
    return;
  }

  console.log(`Reconciling site ${site.id} (${site.hostname})`);

  const input = toManifestInput(site);
  const manifests = buildSiteManifests(input);
  const { name } = siteManifestNames(input);

  if (site.status === 'deleting') {
    console.log(`Deleting site ${site.id}`);
    const secretRef = containerConfigSecretRef({
      siteId: site.id,
      namespace: config.kubernetes.namespace,
      secretName: site.containerConfigSecretName ?? undefined,
    });
    await deleteManifests(k8sClient, [...manifests, secretRef]);
    await prisma.site.delete({ where: { id: site.id } });
    return;
  }

  await prisma.site.update({ where: { id: site.id }, data: { status: 'provisioning' } });

  try {
    await applyManifests(k8sClient, manifests);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to apply manifests for site ${site.id}:`, message);
    await prisma.site.update({ where: { id: site.id }, data: { status: 'failed' } });
    await recordDeployment(site.id, 'failed');
    return;
  }

  const ready = await isDeploymentReady(name, config.kubernetes.namespace);

  await prisma.site.update({
    where: { id: site.id },
    data: { status: ready ? 'ready' : 'degraded' },
  });

  await recordDeployment(site.id, ready ? 'ready' : 'in_progress');
}

async function isDeploymentReady(name: string, namespace: string): Promise<boolean> {
  try {
    const { body } = await k8sClient.apps.readNamespacedDeployment(name, namespace);
    const desired = body.spec?.replicas ?? 0;
    const available = body.status?.availableReplicas ?? 0;
    const observed = body.status?.observedGeneration ?? 0;
    const generation = body.metadata?.generation ?? 0;
    return desired > 0 && available >= desired && observed >= generation;
  } catch (err) {
    console.error(`Failed to read deployment ${name}:`, err);
    return false;
  }
}

async function recordDeployment(siteId: string, status: 'ready' | 'in_progress' | 'failed') {
  await prisma.siteDeployment.upsert({
    where: { id: `${siteId}-current` },
    update: {
      status,
      completedAt: status === 'ready' || status === 'failed' ? new Date() : null,
    },
    create: {
      id: `${siteId}-current`,
      siteId,
      revision: '1',
      image: config.sgtmImage,
      status,
    },
  });
}

async function loop() {
  while (true) {
    try {
      const sites = await prisma.site.findMany({
        where: { status: { in: ['pending', 'provisioning', 'degraded', 'deleting'] } },
        take: 10,
      });

      for (const site of sites) {
        await reconcileSite(site.id);
      }
    } catch (err) {
      console.error('Reconcile loop error:', err);
    }

    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}

loop().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
