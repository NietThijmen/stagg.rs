import { loadConfig } from '@staggers/config';
import { prisma } from '@staggers/db';
import { createKubernetesClient } from '@staggers/kubernetes';
import { initTelemetry } from '@staggers/telemetry';

const config = loadConfig();
initTelemetry({ ...config.otel, serviceName: config.otel.serviceName ?? 'staggers-reconciler' });

const k8sClient = createKubernetesClient(config.kubernetes);

console.log('Kubernetes cluster:', k8sClient.kc.getCurrentCluster()?.name ?? 'unknown');

async function reconcileSite(siteId: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    console.log(`Site ${siteId} not found, skipping`);
    return;
  }

  console.log(`Reconciling site ${site.id} (${site.hostname})`);

  // TODO: generate and apply Deployment, Service, Secret, HTTPRoute, NetworkPolicy, HPA.
  // This is where the control plane emits the manifests from k8s/sgtm/03-example-deployment.yaml
  // using site-specific values.

  await prisma.siteDeployment.upsert({
    where: { id: `${site.id}-current` },
    update: { status: 'ready' },
    create: {
      id: `${site.id}-current`,
      siteId: site.id,
      revision: '1',
      image: config.sgtmImage,
      status: 'ready',
    },
  });
}

async function loop() {
  while (true) {
    try {
      const sites = await prisma.site.findMany({
        where: { status: { in: ['pending', 'provisioning', 'degraded'] } },
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
