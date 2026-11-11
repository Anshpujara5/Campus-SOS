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

## Secrets

Secrets are never stored in `wrangler.jsonc` or committed to Git.

Local development: copy `.env.example` to `.env` (git-ignored) and fill in your own values.

Production (Cloudflare Workers):

```txt
npx wrangler secret put PRISMA_ACCELERATE_URL
npx wrangler secret put JWT_SECRET
```

`JWT_SECRET` must be at least 32 characters; the API refuses to issue or accept tokens otherwise.
Tokens expire after 7 days.

## Tests

```txt
npm test
npm run typecheck
```
