import type { Prisma, PrismaClient } from '@staggers/db';

export const jobTypes = ['sync_egress_config', 'provision_site'] as const;

export type JobType = (typeof jobTypes)[number];

export interface EnqueueJobInput {
  organizationId: string;
  siteId?: string;
  type: JobType;
  payload?: Record<string, unknown>;
}

export function enqueueJob(prisma: PrismaClient, input: EnqueueJobInput) {
  return prisma.provisioningJob.create({
    data: {
      organizationId: input.organizationId,
      siteId: input.siteId ?? null,
      type: input.type,
      payload: input.payload as Prisma.InputJsonValue | undefined,
      status: 'pending',
    },
  });
}
