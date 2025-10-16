-- AlterTable
ALTER TABLE "public"."Alert" ADD COLUMN     "callTo" "public"."Type"[] DEFAULT ARRAY[]::"public"."Type"[];
