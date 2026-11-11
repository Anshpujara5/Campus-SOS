// db/prisma.ts — per-request Prisma Client over Neon's serverless driver
import type { MiddlewareHandler } from 'hono'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../generated/prisma/client'
import type { AppEnv } from '../auth'

// Returns null unless DATABASE_URL is a postgres:// connection string. Accelerate URLs
// (prisma:// or prisma+postgres://) must not be passed to a driver adapter.
export function getDatabaseUrl(env: { DATABASE_URL?: unknown } | undefined): string | null {
  const url = env?.DATABASE_URL
  return typeof url === 'string' && /^postgres(ql)?:\/\/./.test(url) ? url : null
}

export function createPrisma(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })
}

// Workers can't reuse a connection opened by another request, so every request gets its
// own client, disconnected once the response is done.
export const withPrisma: MiddlewareHandler<AppEnv> = async (c, next) => {
  const url = getDatabaseUrl(c.env)
  if (!url) {
    // Never include the connection string in the response or logs.
    console.error('DATABASE_URL is missing or is not a postgres:// connection string')
    return c.json({ error: 'Server misconfigured' }, 500)
  }

  const prisma = createPrisma(url)
  c.set('prisma', prisma)
  try {
    await next()
  } finally {
    const disconnected = prisma.$disconnect()
    try {
      c.executionCtx.waitUntil(disconnected)
    } catch {
      // No ExecutionContext outside the Workers runtime (e.g. tests).
      await disconnected
    }
  }
}
