/*
  Warnings:

  - You are about to drop the column `createdBy` on the `Alert` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `Alert` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Alert" DROP CONSTRAINT "Alert_createdBy_fkey";

-- DropIndex
DROP INDEX "public"."Alert_createdBy_createdAt_idx";

-- AlterTable
ALTER TABLE "public"."Alert" DROP COLUMN "createdBy",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "createdByName" TEXT NOT NULL DEFAULT 'Anonymous';

-- CreateIndex
CREATE INDEX "Alert_createdById_createdAt_idx" ON "public"."Alert"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
