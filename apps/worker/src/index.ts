import { loadConfig } from '@staggers/config';
import { prisma, type ProvisioningJob } from '@staggers/db';
import { createGtmClient, type GtmClient } from '@staggers/gtm';
import {
  applyManifests,
  buildContainerConfigSecret,
  createKubernetesClient,
  siteResourceName,
} from '@staggers/kubernetes';
import { initTelemetry } from '@staggers/telemetry';

const config = loadConfig();
initTelemetry({ ...config.otel, serviceName: config.otel.serviceName ?? 'staggers-worker' });

const k8sClient = createKubernetesClient(config.kubernetes);

let gtmClient: GtmClient | null = null;

function getGtmClient(): GtmClient {
  const { serviceAccountEmail, privateKey, accountId } = config.gtm;
  if (!serviceAccountEmail || !privateKey) {
    throw new Error(
      'GTM is not configured: set GTM_SERVICE_ACCOUNT_EMAIL and GTM_SERVICE_ACCOUNT_PRIVATE_KEY',
    );
  }
  if (!gtmClient) {
    gtmClient = createGtmClient({
      clientEmail: serviceAccountEmail,
      privateKey,
      accountId,
    });
  }
  return gtmClient;
}

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

async function createGtmContainer(job: ProvisioningJob) {
  const site = await requireSite(job);

  if (site.gtmAccountId && site.gtmContainerId) {
    console.log(`Site ${site.id} already has GTM container ${site.gtmContainerId}`);
    return;
  }

  const client = getGtmClient();
  const accountId =
    site.gtmAccountId ?? config.gtm.accountId ?? (await client.resolveAccountId());

  const container = await client.createServerContainer({
    accountId,
    name: site.name,
    domainName: [site.hostname],
  });

  await prisma.site.update({
    where: { id: site.id },
    data: {
      gtmAccountId: accountId,
      gtmContainerId: container.containerId,
    },
  });

  console.log(
    `Created GTM container ${container.publicId ?? container.containerId} for site ${site.id}`,
  );
}

async function fetchContainerConfig(job: ProvisioningJob) {
  const site = await requireSite(job);

  if (!site.gtmAccountId || !site.gtmContainerId) {
    throw new Error(`Site ${site.id} has no GTM container; run create_gtm_container first`);
  }

  const client = getGtmClient();
  const containerConfig = await client.getContainerConfig(
    site.gtmAccountId,
    site.gtmContainerId,
  );

  const secretName = `${siteResourceName(site.id)}-config`;
  await applyManifests(k8sClient, [
    buildContainerConfigSecret({
      siteId: site.id,
      namespace: config.kubernetes.namespace,
      secretName,
      containerConfig,
    }),
  ]);

  await prisma.site.update({
    where: { id: site.id },
    data: { containerConfigSecretName: secretName, status: 'pending' },
  });

  console.log(`Stored container config for site ${site.id} in secret ${secretName}`);
}

const handlers: Record<string, (job: ProvisioningJob) => Promise<void>> = {
  create_gtm_container: createGtmContainer,
  fetch_container_config: fetchContainerConfig,
  provision_site: async (job) => {
    await createGtmContainer(job);
    await fetchContainerConfig(job);
  },
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.provisioningJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: message, completedAt: new Date() },
    });
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
