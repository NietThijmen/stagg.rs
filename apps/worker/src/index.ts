import { loadConfig } from '@staggers/config';
import { prisma, type ProvisioningJob } from '@staggers/db';
import {
  applyManifests,
  buildContainerConfigSecret,
  buildEgressManifests,
  buildSiteNamespace,
  createKubernetesClient,
  siteNamespace,
  siteResourceName,
} from '@staggers/kubernetes';
import { initTelemetry } from '@staggers/telemetry';

const config = loadConfig();
initTelemetry({ ...config.otel, serviceName: config.otel.serviceName ?? 'staggers-worker' });

const k8sClient = createKubernetesClient(config.kubernetes);

async function requireSite(job: ProvisioningJob) {
  const siteId = job.siteId ?? (job.payload as { siteId?: string } | null)?.siteId;
  if (!siteId) {
    throw new Error(`${job.type} requires a siteId`);
  }
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    throw new Error(`Site ${siteId} not found`);
  }
  return site;
}

async function provisionSite(job: ProvisioningJob) {
  const site = await requireSite(job);

  if (!site.containerConfig) {
    throw new Error(
      `Site ${site.id} has no container config; provide one when creating the site`,
    );
  }

  const secretName = `${siteResourceName(site.id)}-config`;
  const namespace = siteNamespace(site.id, config.kubernetes.namespace);
  await applyManifests(k8sClient, [
    buildSiteNamespace(site.id, namespace),
    buildContainerConfigSecret({
      siteId: site.id,
      namespace,
      secretName,
      containerConfig: site.containerConfig,
    }),
  ]);

  await prisma.site.update({
    where: { id: site.id },
    data: { containerConfigSecretName: secretName, status: 'pending' },
  });

  console.log(`Stored container config for site ${site.id} in secret ${secretName}`);
}

const handlers: Record<string, (job: ProvisioningJob) => Promise<void>> = {
  sync_egress_config: async (job) => {
    const site = await requireSite(job);
    const namespace = siteNamespace(site.id, config.kubernetes.namespace);

    const destinations = await prisma.downstreamDestination.findMany({
      where: { siteId: site.id, enabled: true },
    });

    await applyManifests(k8sClient, [
      buildSiteNamespace(site.id, namespace),
      ...buildEgressManifests({
        siteId: site.id,
        namespace,
        serviceAccountName: siteResourceName(site.id),
        hosts: destinations.map((destination) => destination.host),
      }),
    ]);

    console.log(
      `Synced egress allowlist for site ${site.id} with ${destinations.length} destination(s)`,
    );
  },
  provision_site: provisionSite,
};

async function processJob(jobId: string) {
  const job = await prisma.provisioningJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'pending') return;

  console.log(`Processing job ${job.id} of type ${job.type}`);

  await prisma.provisioningJob.update({
    where: { id: job.id },
    data: { status: 'in_progress', startedAt: new Date() },
  });

  try {
    const handler = handlers[job.type];
    if (!handler) {
      throw new Error(`Unknown job type: ${job.type}`);
    }

    await handler(job);

    await prisma.provisioningJob.update({
      where: { id: job.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    console.info(`Job ${job.id} completed successfully`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.provisioningJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: message, completedAt: new Date() },
    });

    console.error(`Job ${job.id} failed:`, message);
  }
}

async function loop() {
  while (true) {
    try {
      const job = await prisma.provisioningJob.findFirst({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
      });

      if (job) {
        await processJob(job.id);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    } catch (err) {
      console.error('Worker loop error:', err);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

loop().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
