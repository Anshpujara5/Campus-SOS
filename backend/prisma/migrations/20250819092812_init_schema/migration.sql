-- DropForeignKey
ALTER TABLE "public"."Alert" DROP CONSTRAINT "Alert_createdBy_fkey";

-- AlterTable
ALTER TABLE "public"."Alert" ALTER COLUMN "createdBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
