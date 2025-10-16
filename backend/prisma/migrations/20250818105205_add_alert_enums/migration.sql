-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('student', 'security', 'driver');

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('active', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" TEXT NOT NULL,
    "type" "public"."AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_status_createdAt_idx" ON "public"."Alert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_createdBy_createdAt_idx" ON "public"."Alert"("createdBy", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
