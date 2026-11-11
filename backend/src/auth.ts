// auth.ts — shared JWT helpers and auth middleware for all routers
import type { MiddlewareHandler } from 'hono'
import { sign, verify } from 'hono/jwt'

export const ROLES = ['student', 'security', 'driver', 'faculty'] as const
export type Role = (typeof ROLES)[number]

export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
export const MIN_JWT_SECRET_LENGTH = 32

export type AppEnv = {
  Bindings: {
    JWT_SECRET: string
    PRISMA_ACCELERATE_URL: string
  }
  Variables: {
    userId: string
    role: Role
    name: string
  }
}

export function isRole(x: unknown): x is Role {
  return typeof x === 'string' && (ROLES as readonly string[]).includes(x)
}

// Returns null when the secret is missing or too weak, so callers can fail closed.
export function getJwtSecret(env: { JWT_SECRET?: unknown } | undefined): string | null {
  const secret = env?.JWT_SECRET
  return typeof secret === 'string' && secret.length >= MIN_JWT_SECRET_LENGTH ? secret : null
}

export function misconfigured(c: { json: (body: unknown, status: 500) => Response }) {
  // Never include the secret (or its length) in the response or logs.
  console.error('JWT_SECRET is missing or shorter than the required minimum length')
  return c.json({ error: 'Server misconfigured' }, 500)
}

export async function signToken(user: { id: string; role: string; name: string }, secret: string) {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    { id: user.id, role: user.role, name: user.name, iat: now, exp: now + TOKEN_TTL_SECONDS },
    secret,
    'HS256'
  )
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const secret = getJwtSecret(c.env)
  if (!secret) return misconfigured(c)

  const [scheme, token] = (c.req.header('Authorization') ?? '').split(' ')
  if (scheme !== 'Bearer' || !token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verify(token, secret, 'HS256')
    // hono only enforces exp when present; tokens without exp never expire, so reject them.
    if (typeof payload.exp !== 'number') return c.json({ error: 'Unauthorized' }, 401)
    if (typeof payload.id !== 'string' || !payload.id) return c.json({ error: 'Unauthorized' }, 401)
    if (!isRole(payload.role)) return c.json({ error: 'Unauthorized' }, 401)

    c.set('userId', payload.id)
    c.set('role', payload.role)
    c.set('name', typeof payload.name === 'string' ? payload.name : 'Anonymous')
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
}
