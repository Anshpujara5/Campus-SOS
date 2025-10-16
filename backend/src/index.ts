import { Hono } from 'hono'
import { userRouter } from './routes/user'
import { Alert } from './routes/Alert';
import { location } from "./routes/location";
import { cors } from 'hono/cors'

const app = new Hono<{
  Bindings:{
    DATABASE_URL:string
  }
}>();

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'], 
}));
app.route('api/v1/user',userRouter)
app.route('api/v1/alert',Alert)
app.route("/api/v1/location", location);

export default app