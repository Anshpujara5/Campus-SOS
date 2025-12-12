import { PrismaClient } from "../generated/prisma";

export const prisma = new PrismaClient({
  accelerateUrl: process.env.PRISMA_ACCELERATE_URL!,
});