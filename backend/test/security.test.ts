// Security regression tests. Prisma Client and the Neon adapter are mocked: no database or real credentials are used.
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decode, sign } from 'hono/jwt'
import * as bcrypt from 'bcryptjs'

type FakeAlert = { id: string; createdById: string; status: string; message: string }

type FakeUser = { id: string; email: string; name: string; role: string; password: string }

const db = vi.hoisted(() => {
  const db = { alerts: [] as FakeAlert[], users: [] as FakeUser[], prisma: {} as any }
  db.prisma = {
    alert: {
      updateMany: vi.fn(async ({ where, data }: { where: Partial<FakeAlert>; data: Partial<FakeAlert> }) => {
        const rows = db.alerts.filter((a) => a.id === where.id && a.createdById === where.createdById)
        rows.forEach((a) => Object.assign(a, data))
        return { count: rows.length }
      }),
      update: vi.fn(async () => {
        throw new Error('unscoped alert.update must not be used')
      }),
      findMany: vi.fn(async () => db.alerts),
    },
    user: {
      create: vi.fn(async ({ data }: any) => {
        const user = { id: `u-${db.users.length + 1}`, ...data }
        db.users.push(user)
        return user
      }),
      findUnique: vi.fn(async ({ where }: any) =>
        db.users.find((u) => u.email === where.email || u.id === where.id) ?? null
      ),
      update: vi.fn(),
    },
    $disconnect: vi.fn(async () => {}),
  }
  return db
})

vi.mock('../src/generated/prisma/client', () => ({
  PrismaClient: vi.fn(function () {
    return db.prisma
  }),
}))
vi.mock('@prisma/adapter-neon', () => ({ PrismaNeon: vi.fn() }))

import app from '../src/index'
import { TOKEN_TTL_SECONDS } from '../src/auth'

const SECRET = 'test-secret-'.padEnd(48, 'x')
const DB_ENV = { DATABASE_URL: 'postgres://FAKE_POOLED.example.invalid/campus_sos' }
const ENV = { ...DB_ENV, JWT_SECRET: SECRET }
const prisma = db.prisma
const now = () => Math.floor(Date.now() / 1000)

async function token(claims: Record<string, unknown> = {}, secret = SECRET) {
  return sign({ id: 'user-a', role: 'student', name: 'A', exp: now() + 3600, ...claims }, secret, 'HS256')
}

async function call(path: string, init: RequestInit & { auth?: string } = {}, env: object = ENV) {
  const headers = new Headers(init.headers)
  if (init.auth) headers.set('Authorization', `Bearer ${init.auth}`)
  if (init.body) headers.set('Content-Type', 'application/json')
  return app.request(path, { ...init, headers }, env)
}

beforeEach(() => {
  vi.clearAllMocks()
  db.alerts = [{ id: 'alert-1', createdById: 'owner', status: 'active', message: 'original' }]
  db.users = []
})

describe('unauthenticated access', () => {
  it.each([
    ['GET', '/api/v1/user/me'],
    ['GET', '/api/v1/alert/alerts'],
    ['PUT', '/api/v1/alert/alerts/alert-1/resolve'],
    ['PUT', '/api/v1/alert/alerts/update'],
    ['GET', '/api/v1/location'],
    ['POST', '/api/v1/location/put'],
  ])('%s %s returns 401 without a token', async (method, path) => {
    const res = await call(path, { method })
    expect(res.status).toBe(401)
  })

  it('rejects a non-Bearer Authorization header', async () => {
    const res = await call('/api/v1/user/me', { headers: { Authorization: await token() } })
    expect(res.status).toBe(401)
  })

  it('does not touch the database when unauthenticated', async () => {
    await call('/api/v1/alert/alerts/alert-1/resolve', { method: 'PUT' })
    expect(prisma.alert.updateMany).not.toHaveBeenCalled()
    expect(db.alerts[0].status).toBe('active')
  })
})

describe('token verification', () => {
  it('accepts a valid, unexpired token', async () => {
    const res = await call('/api/v1/alert/alerts', { auth: await token() })
    expect(res.status).toBe(200)
  })

  it('rejects an expired token', async () => {
    const res = await call('/api/v1/alert/alerts', { auth: await token({ exp: now() - 10 }) })
    expect(res.status).toBe(401)
  })

  it('rejects a legacy token with no exp claim', async () => {
    const legacy = await sign({ id: 'user-a', role: 'student', name: 'A' }, SECRET, 'HS256')
    const res = await call('/api/v1/alert/alerts', { auth: legacy })
    expect(res.status).toBe(401)
  })

  it('rejects a token signed with a different secret', async () => {
    const forged = await token({}, 'attacker-secret-'.padEnd(48, 'y'))
    const res = await call('/api/v1/alert/alerts', { auth: forged })
    expect(res.status).toBe(401)
  })

  it('rejects an unsigned (alg=none) token', async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: 'user-a', role: 'security', exp: now() + 3600 })}.`
    const res = await call('/api/v1/alert/alerts', { auth: unsigned })
    expect(res.status).toBe(401)
  })

  it('rejects a token with an unknown role', async () => {
    const res = await call('/api/v1/alert/alerts', { auth: await token({ role: 'admin' }) })
    expect(res.status).toBe(401)
  })

  it('issues tokens that expire', async () => {
    const res = await call('/api/v1/user/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@example.com', password: 'password1', name: 'New', role: 'student' }),
    })
    expect(res.status).toBe(200)
    const { jwt } = (await res.json()) as { jwt: string }
    const { payload } = decode(jwt)
    expect(typeof payload.exp).toBe('number')
    expect((payload.exp as number) - now()).toBeLessThanOrEqual(TOKEN_TTL_SECONDS)
    expect((payload.exp as number) - now()).toBeGreaterThan(TOKEN_TTL_SECONDS - 60)
  })
})

describe('cross-user alert updates', () => {
  it('lets the creator resolve their own alert', async () => {
    const res = await call('/api/v1/alert/alerts/alert-1/resolve', { method: 'PUT', auth: await token({ id: 'owner' }) })
    expect(res.status).toBe(200)
    expect(db.alerts[0].status).toBe('resolved')
  })

  it.each(['student', 'security', 'driver', 'faculty'])(
    'does not let another %s resolve someone else’s alert',
    async (role) => {
      const res = await call('/api/v1/alert/alerts/alert-1/resolve', {
        method: 'PUT',
        auth: await token({ id: 'intruder', role }),
      })
      expect(res.status).toBe(404)
      expect(db.alerts[0].status).toBe('active')
    }
  )

  it('lets the creator edit their own alert', async () => {
    const res = await call('/api/v1/alert/alerts/update', {
      method: 'PUT',
      auth: await token({ id: 'owner' }),
      body: JSON.stringify({ id: 'alert-1', title: 't', message: 'edited' }),
    })
    expect(res.status).toBe(200)
    expect(db.alerts[0].message).toBe('edited')
  })

  it('does not let another user edit someone else’s alert', async () => {
    const res = await call('/api/v1/alert/alerts/update', {
      method: 'PUT',
      auth: await token({ id: 'intruder' }),
      body: JSON.stringify({ id: 'alert-1', title: 't', message: 'hijacked' }),
    })
    expect(res.status).toBe(404)
    expect(db.alerts[0].message).toBe('original')
  })

  it('never uses an unscoped alert.update', async () => {
    await call('/api/v1/alert/alerts/alert-1/resolve', { method: 'PUT', auth: await token({ id: 'intruder' }) })
    expect(prisma.alert.update).not.toHaveBeenCalled()
  })
})

describe('role escalation', () => {
  it('has no self-service role change endpoint', async () => {
    const res = await call('/api/v1/user/role', {
      method: 'POST',
      auth: await token({ role: 'student' }),
      body: JSON.stringify({ role: 'security' }),
    })
    expect(res.status).toBe(404)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('rejects signup with a role outside the allowed set', async () => {
    const res = await call('/api/v1/user/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'x@example.com', password: 'password1', name: 'X', role: 'admin' }),
    })
    expect(res.status).toBe(400)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('takes the role from the signed token, not the request body', async () => {
    await call('/api/v1/location/put', {
      method: 'POST',
      auth: await token({ id: 'loc-user', role: 'student' }),
      body: JSON.stringify({ lat: 1, lng: 2, role: 'security' }),
    })
    const res = await call('/api/v1/location/fetch', { auth: await token({ id: 'loc-user', role: 'student' }) })
    const { data } = (await res.json()) as { data: { role: string } }
    expect(data.role).toBe('student')
  })
})

describe('location role alignment', () => {
  it.each(['student', 'security', 'driver', 'faculty'])('accepts %s tokens', async (role) => {
    const res = await call('/api/v1/location', { auth: await token({ role }) })
    expect(res.status).toBe(200)
  })

  it.each(['guard', 'ambulance'])('rejects legacy %s role', async (role) => {
    const res = await call('/api/v1/location', { auth: await token({ role }) })
    expect(res.status).toBe(401)
  })
})

describe('disabled debug routes', () => {
  // Obviously fake, non-URL values so secret scanners don't flag the test itself.
  const envWithDbUrl = {
    ...ENV,
    DATABASE_URL: 'postgres://FAKE_DB_URL.example.invalid/db',
    DIRECT_URL: 'postgres://FAKE_DIRECT_URL.example.invalid/db',
  }

  it.each(['/api/v1/user/debug/db', '/api/v1/user/debug/accelerate'])('%s is gone', async (path) => {
    for (const auth of [undefined, await token()]) {
      const res = await call(path, { auth }, envWithDbUrl)
      expect(res.status).not.toBe(200)
      const text = await res.text()
      expect(text).not.toContain('example.invalid')
      expect(text).not.toContain('FAKE_')
    }
  })

  it('the unauthenticated echo endpoint is gone', async () => {
    const res = await call('/api/v1/put', { method: 'POST', body: '{"a":1}' })
    expect(res.status).toBe(404)
  })

  it('does not log database URLs or tokens', async () => {
    const spies = (['log', 'info', 'debug', 'warn', 'error'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {})
    )
    const res = await call(
      '/api/v1/user/signup',
      {
        method: 'POST',
        body: JSON.stringify({ email: 'log@example.com', password: 'password1', name: 'L', role: 'student' }),
      },
      envWithDbUrl
    )
    const { jwt } = (await res.json()) as { jwt: string }
    const logged = spies.flatMap((s) => s.mock.calls.flat().map(String)).join('\n')
    spies.forEach((s) => s.mockRestore())
    expect(logged).not.toContain('example.invalid')
    expect(logged).not.toContain(jwt)
  })
})

describe('public API response exposure', () => {
  it('signin returns only a token, never the password hash', async () => {
    db.users.push({
      id: 'u-1', email: 'a@example.com', name: 'A', role: 'student', password: bcrypt.hashSync('password1', 4),
    })
    const res = await call('/api/v1/user/signin', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'password1' }),
    })
    expect(res.status).toBe(200)
    expect(Object.keys((await res.json()) as object)).toEqual(['jwt'])
  })

  it('gives the same answer for unknown email and wrong password', async () => {
    db.users.push({
      id: 'u-1', email: 'a@example.com', name: 'A', role: 'student', password: bcrypt.hashSync('password1', 4),
    })
    const unknown = await call('/api/v1/user/signin', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@example.com', password: 'password1' }),
    })
    const wrong = await call('/api/v1/user/signin', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'wrong-password' }),
    })
    expect(unknown.status).toBe(wrong.status)
    expect(await unknown.json()).toEqual(await wrong.json())
  })
})

describe('missing or misconfigured secrets', () => {
  it.each([
    ['missing', { ...DB_ENV }],
    ['empty', { ...DB_ENV, JWT_SECRET: '' }],
    ['too short', { ...DB_ENV, JWT_SECRET: 'short-secret' }],
  ])('fails closed when JWT_SECRET is %s', async (_label, env) => {
    const me = await call('/api/v1/user/me', { auth: await token() }, env)
    expect(me.status).toBe(500)
    expect(await me.json()).toEqual({ error: 'Server misconfigured' })

    const signup = await call(
      '/api/v1/user/signup',
      {
        method: 'POST',
        body: JSON.stringify({ email: 'z@example.com', password: 'password1', name: 'Z', role: 'student' }),
      },
      env
    )
    expect(signup.status).toBe(500)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})

describe('tracked configuration', () => {
  it('wrangler.jsonc contains no connection strings or API keys', () => {
    const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')
    expect(config).not.toMatch(/postgres(ql)?:\/\/|prisma(\+postgres)?:\/\/|api_key=/i)
    expect(config).not.toMatch(/"vars"\s*:/)
  })

  it('.env.example contains placeholders only', () => {
    const example = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
    expect(example).not.toMatch(/postgres(ql)?:\/\/|prisma(\+postgres)?:\/\/|api_key=/i)
    for (const line of example.split('\n').filter((l) => /^[A-Z_]+=/.test(l))) {
      expect(line).toMatch(/="<[^>]+>"$/)
    }
  })
})
