/*
  Warnings:

  - Changed the type of `type` on the `Alert` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."Type" AS ENUM ('student', 'security', 'driver');

-- AlterTable
ALTER TABLE "public"."Alert" DROP COLUMN "type",
ADD COLUMN     "type" "public"."Type" NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."Type" NOT NULL DEFAULT 'student';

-- DropEnum
DROP TYPE "public"."AlertType";
