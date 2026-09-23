/*
  Warnings:

  - You are about to drop the column `gtm_account_id` on the `sites` table. All the data in the column will be lost.
  - You are about to drop the column `gtm_container_id` on the `sites` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sites" DROP COLUMN "gtm_account_id",
DROP COLUMN "gtm_container_id",
ADD COLUMN     "container_config" TEXT;
