import { loadConfig } from '@staggers/config';
import { prisma } from '@staggers/db';
import { initTelemetry } from '@staggers/telemetry';

const config = loadConfig();
initTelemetry({ ...config.otel, serviceName: config.otel.serviceName ?? 'staggers-worker' });

async function processJob(jobId: string) {
  const job = await prisma.provisioningJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'pending') return;

  console.log(`Processing job ${job.id} of type ${job.type}`);

  await prisma.provisioningJob.update({
    where: { id: job.id },
    data: { status: 'in_progress', startedAt: new Date() },
  });

  try {
    // TODO: implement job handlers:
    // - create_gtm_container
    // - fetch_container_config
    // - verify_dns
    // - verify_certificate
    // - test_event

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
