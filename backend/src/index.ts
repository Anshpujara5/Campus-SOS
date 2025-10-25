// index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { userRouter } from './routes/user'
import { Alert } from './routes/Alert'
import { location } from './routes/location'

const app = new Hono<{
  Bindings: { DATABASE_URL: string }
}>()

app.get('/', (c) => c.text('Hello Hono!'))

const allowlist = new Set<string>([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://your-frontend.com',
])

app.use('*', cors({
  // ✅ correct signature + return type (no 'false')
  origin: (origin: string | undefined, _c) => {
    // curl / non-browser: allow all (or return undefined to block)
    if (!origin) return '*'                // or: return undefined
    return allowlist.has(origin) ? origin : null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Type'],
  // credentials: true, // only if using cookies + single specific origin
  maxAge: 600,
}))

app.route('/api/v1/user', userRouter)
app.route('/api/v1/alert', Alert)
app.route('/api/v1/location', location)

app.post('/api/v1/put', async (c) => {
  try {
    const body = await c.req.json()
    return c.json({ ok: true, received: body }, 200, { 'Cache-Control': 'no-store' })
  } catch {
    return c.json({ error: 'invalid JSON' }, 400, { 'Cache-Control': 'no-store' })
  }
})

export default app



// import { Hono } from 'hono'
// import { userRouter } from './routes/user'
// import { Alert } from './routes/Alert';
// import { location } from "./routes/location";
// import { cors } from 'hono/cors'

// const app = new Hono<{
//   Bindings:{
//     DATABASE_URL:string
//   }
// }>();

// app.get('/', (c) => {
//   return c.text('Hello Hono!')
// })

// app.use('/*', cors({
//   origin: '*',
//   allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowHeaders: ['Content-Type', 'Authorization'], 
// }));

// app.options("*", cors());
// app.route('api/v1/user',userRouter)
// app.route('api/v1/alert',Alert)
// app.route("/api/v1/location", location);

// export default app