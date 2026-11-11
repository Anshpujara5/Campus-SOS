```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Database

The Worker connects to Neon through the Prisma 7 driver adapter `@prisma/adapter-neon`
(`src/db/prisma.ts`). A new Prisma Client is created for each request and disconnected
afterwards, because Workers can't reuse a connection opened by another request.

- `DATABASE_URL`: Neon **pooled** connection string (hostname contains `-pooler`). Used by the Worker.
- `DIRECT_URL`: Neon **direct** connection string. Used only by the Prisma CLI (`prisma.config.ts`)
  for migrations. Keep it on your machine.

`prisma generate` and `prisma migrate` read `DIRECT_URL`, so it must be set in `backend/.env`.

## Secrets

Secrets are never stored in `wrangler.jsonc` or committed to Git.

Local development: copy `.env.example` to `.env` (git-ignored) and fill in your own values.

Production (Cloudflare Workers), stored as encrypted secrets:

```txt
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
```

`JWT_SECRET` must be at least 32 characters; the API refuses to issue or accept tokens otherwise.
Tokens expire after 7 days. If `DATABASE_URL` is missing or isn't a `postgres://` URL, database
routes return 500 without revealing the value.

## Public access

`wrangler.jsonc` sets `"workers_dev": false` and `"preview_urls": false`, so deploying never
re-enables the `workers.dev` or preview URLs. Expose the API deliberately (route or custom domain)
once secrets are configured.

## Tests

```txt
npm test
npm run typecheck
```
