// Database configuration tests. Prisma Client, the Neon adapter and dotenv are mocked:
// nothing connects to a database and no local .env file is read.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sign } from 'hono/jwt'

const fake = vi.hoisted(() => ({
  clients: [] as { options: any; $disconnect: ReturnType<typeof vi.fn> }[],
  failQueries: false,
}))

vi.mock('../src/generated/prisma/client', () => ({
  PrismaClient: vi.fn(function (options: unknown) {
    const query = vi.fn(async () => {
      if (fake.failQueries) throw new Error('query failed')
      return null
    })
    const client = {
      options,
      alert: { findMany: vi.fn(async () => []), findUnique: query },
      user: { findUnique: query },
      $disconnect: vi.fn(async () => {}),
    }
    fake.clients.push(client)
    return client
  }),
}))
vi.mock('@prisma/adapter-neon', () => ({
  PrismaNeon: vi.fn(function (this: { config: unknown }, config: unknown) {
    this.config = config
  }),
}))
vi.mock('dotenv/config', () => ({}))

import app from '../src/index'
import { PrismaNeon } from '@prisma/adapter-neon'
import { getDatabaseUrl } from '../src/db/prisma'

const POOLED_URL = 'postgres://FAKE_POOLED-pooler.example.invalid/campus_sos'
const SECRET = 'test-secret-'.padEnd(48, 'x')
const ENV = { JWT_SECRET: SECRET, DATABASE_URL: POOLED_URL }
const backend = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, backend), 'utf8')

async function auth() {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return { Authorization: `Bearer ${await sign({ id: 'user-a', role: 'student', name: 'A', exp }, SECRET, 'HS256')}` }
}

function fakeExecutionCtx() {
  return { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} }
}

beforeEach(() => {
  vi.clearAllMocks()
  fake.clients = []
  fake.failQueries = false
})

describe('runtime database connection', () => {
  it('connects through the Neon adapter using the DATABASE_URL secret', async () => {
    const res = await app.request('/api/v1/alert/alerts', { headers: await auth() }, ENV)
    expect(res.status).toBe(200)
    expect(PrismaNeon).toHaveBeenCalledWith({ connectionString: POOLED_URL })
    expect(fake.clients).toHaveLength(1)
    const { options } = fake.clients[0]
    expect(options.adapter).toBeInstanceOf(PrismaNeon)
    expect(Object.keys(options)).toEqual(['adapter'])
  })

  it('creates a separate client for every request', async () => {
    const headers = await auth()
    await app.request('/api/v1/alert/alerts', { headers }, ENV)
    await app.request('/api/v1/alert/alerts', { headers }, ENV)
    expect(fake.clients).toHaveLength(2)
    expect(fake.clients[0]).not.toBe(fake.clients[1])
  })

  it('disconnects after the response via waitUntil', async () => {
    const ctx = fakeExecutionCtx()
    await app.request('/api/v1/alert/alerts', { headers: await auth() }, ENV, ctx as any)
    expect(fake.clients[0].$disconnect).toHaveBeenCalledTimes(1)
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1)
    expect(ctx.waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise)
  })

  it('still disconnects when a query throws', async () => {
    fake.failQueries = true
    const res = await app.request('/api/v1/alert/alerts/alert-1', { headers: await auth() }, ENV)
    expect(res.status).toBe(500)
    expect(fake.clients[0].$disconnect).toHaveBeenCalledTimes(1)
  })

  it('does not open a database client for unauthenticated requests', async () => {
    const res = await app.request('/api/v1/alert/alerts', {}, ENV)
    expect(res.status).toBe(401)
    expect(fake.clients).toHaveLength(0)
  })

  it('serves routes that do not use the database without DATABASE_URL', async () => {
    const env = { JWT_SECRET: SECRET }
    expect((await app.request('/api/v1/user/health', {}, env)).status).toBe(200)
    expect((await app.request('/api/v1/location', { headers: await auth() }, env)).status).toBe(200)
    expect(fake.clients).toHaveLength(0)
  })
})

describe('missing or misconfigured DATABASE_URL', () => {
  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['an Accelerate prisma:// URL', 'prisma://FAKE_ACCELERATE.example.invalid'],
    ['an Accelerate prisma+postgres:// URL', 'prisma+postgres://FAKE_ACCELERATE.example.invalid'],
    ['not a URL', 'FAKE_NOT_A_URL'],
  ])('fails closed when DATABASE_URL is %s', async (_label, value) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = { JWT_SECRET: SECRET, ...(value === undefined ? {} : { DATABASE_URL: value }) }
    const me = await app.request('/api/v1/user/me', { headers: await auth() }, env)
    const signin = await app.request(
      '/api/v1/user/signin',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email":"a@example.com","password":"password1"}' },
      env
    )
    const logged = errors.mock.calls.flat().map(String).join('\n')
    errors.mockRestore()

    for (const res of [me, signin]) {
      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'Server misconfigured' })
    }
    expect(fake.clients).toHaveLength(0)
    expect(PrismaNeon).not.toHaveBeenCalled()
    expect(logged).not.toContain('FAKE_')
  })

  it('accepts postgres:// and postgresql:// connection strings', () => {
    expect(getDatabaseUrl({ DATABASE_URL: POOLED_URL })).toBe(POOLED_URL)
    expect(getDatabaseUrl({ DATABASE_URL: 'postgresql://FAKE.example.invalid/db' })).toBe('postgresql://FAKE.example.invalid/db')
    expect(getDatabaseUrl({ DATABASE_URL: 42 })).toBeNull()
    expect(getDatabaseUrl(undefined)).toBeNull()
  })

  it('never logs the connection string on a successful request', async () => {
    const spies = (['log', 'info', 'debug', 'warn', 'error'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {})
    )
    await app.request('/api/v1/alert/alerts', { headers: await auth() }, ENV)
    const logged = spies.flatMap((s) => s.mock.calls.flat().map(String)).join('\n')
    spies.forEach((s) => s.mockRestore())
    expect(logged).not.toContain('FAKE_POOLED')
  })
})

describe('Prisma CLI configuration', () => {
  const saved = { DIRECT_URL: process.env.DIRECT_URL, DATABASE_URL: process.env.DATABASE_URL }

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    vi.resetModules()
  })

  it('migrations use the direct DIRECT_URL, not the pooled runtime URL', async () => {
    process.env.DIRECT_URL = 'FAKE_DIRECT_URL'
    process.env.DATABASE_URL = 'FAKE_POOLED_URL'
    vi.resetModules()
    const { default: config } = await import('../prisma.config')
    expect(config.datasource?.url).toBe('FAKE_DIRECT_URL')
  })

  it('fails loudly when DIRECT_URL is not set', async () => {
    delete process.env.DIRECT_URL
    process.env.DATABASE_URL = 'FAKE_POOLED_URL'
    vi.resetModules()
    await expect(import('../prisma.config')).rejects.toThrow(/DIRECT_URL/)
  })

  it('schema uses the Cloudflare prisma-client generator and keeps URLs out of the schema', () => {
    const schema = read('prisma/schema.prisma')
    const generator = schema.match(/generator client \{([^}]*)\}/)?.[1] ?? ''
    const datasource = schema.match(/datasource db \{([^}]*)\}/)?.[1] ?? ''
    expect(generator).toMatch(/provider\s*=\s*"prisma-client"/)
    expect(generator).toMatch(/runtime\s*=\s*"cloudflare"/)
    expect(generator).toMatch(/output\s*=\s*"\.\.\/src\/generated\/prisma"/)
    expect(datasource).toMatch(/provider\s*=\s*"postgresql"/)
    expect(datasource).not.toMatch(/\b(url|directUrl)\s*=/)
  })
})

describe('deployment configuration', () => {
  // JSONC: drop comment lines and trailing commas before parsing.
  const wrangler = JSON.parse(
    read('wrangler.jsonc')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')
      .replace(/,(\s*[}\]])/g, '$1')
  )

  it('keeps workers.dev and preview URLs disabled', () => {
    expect(wrangler.workers_dev).toBe(false)
    expect(wrangler.preview_urls).toBe(false)
  })

  it('stores no plaintext variables in wrangler.jsonc', () => {
    expect(wrangler.vars).toBeUndefined()
    expect(JSON.stringify(wrangler)).not.toMatch(/postgres(ql)?:\/\/|prisma(\+postgres)?:\/\/|api_key=/i)
  })

  it('has no Accelerate dependency, flag, or import left', () => {
    const pkg = JSON.parse(read('package.json'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(deps).not.toHaveProperty('@prisma/extension-accelerate')
    expect(deps['@prisma/adapter-neon']).toBe(deps['@prisma/client'])
    expect(Object.values(pkg.scripts).join('\n')).not.toMatch(/--no-engine|--accelerate|--data-proxy/)

    const sources: string[] = []
    const walk = (dir: URL) => {
      for (const name of readdirSync(dir)) {
        if (name === 'generated') continue
        const entry = new URL(name, dir)
        if (statSync(entry).isDirectory()) walk(new URL(`${name}/`, dir))
        else if (name.endsWith('.ts')) sources.push(readFileSync(entry, 'utf8'))
      }
    }
    walk(new URL('src/', backend))
    expect(sources.length).toBeGreaterThan(0)
    for (const source of sources) {
      expect(source).not.toMatch(/extension-accelerate|withAccelerate|accelerateUrl|datasourceUrl/)
      expect(source).not.toMatch(/process\.env/)
    }
  })

  it('.env.example documents exactly the database and JWT placeholders', () => {
    const keys = read('.env.example')
      .split('\n')
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => line.split('=')[0])
    expect(keys.sort()).toEqual(['DATABASE_URL', 'DIRECT_URL', 'JWT_SECRET'])
  })
})
