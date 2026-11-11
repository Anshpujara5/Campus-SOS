// index.ts
import { Hono } from 'hono'
import { userRouter } from './routes/user'
import { Alert } from './routes/Alert'
import { location } from './routes/location'
import { cors } from './cors'
import type { AppEnv } from './auth'

const app = new Hono<AppEnv>()

app.get('/', (c) => c.text('Hello Hono!'))

const allowlist = new Set<string>([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://your-frontend.com',
])

app.use("*", cors);

app.route('/api/v1/user', userRouter)
app.route('/api/v1/alert', Alert)
app.route('/api/v1/location', location)

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