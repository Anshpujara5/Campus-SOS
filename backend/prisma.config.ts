import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // The CLI (migrate, db pull, studio) needs a direct, non-pooled Neon connection.
  // The Worker runtime uses the pooled DATABASE_URL secret instead (see src/db/prisma.ts).
  datasource: { url: env("DIRECT_URL") },
});
