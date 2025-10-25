import { Hono } from "hono";
import { verify } from "hono/jwt";
import { streamSSE } from "hono/streaming";

type Role = "student" | "ambulance" | "driver" | "guard" | "faculty" | string;

type Loc = {
  userId: string;
  name: string;
  role: Role;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  ts: number;
};

const latest = new Map<string, Loc>();
const subscribers = new Set<(payload: unknown) => void>();

let bc: BroadcastChannel | null = null;
try {
  // @ts-ignore
  bc = new BroadcastChannel("location-updates");
  bc.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg?.type === "location" && msg.data) {
      const loc = msg.data as Loc;
      latest.set(loc.userId, loc); 
    }
    for (const send of subscribers) send(e.data);
  };
} catch {}

const isNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

const isRole = (r: unknown): r is Role =>
  typeof r === "string" &&
  ["student", "ambulance", "driver", "guard", "faculty"].includes(r as string);

const broadcast = async (msg: unknown) => {
  for (const send of subscribers) {
    try { send(msg); } catch {}
  }
  bc?.postMessage(msg);
};

export const location = new Hono<{
    Bindings:{
        DATABASE_URL:string
        DIRECT_URL:string
        JWT_SECRET:string
    },
    Variables:{
        userId:string,
        role:Role,
        name:string
    }
}>();

location.use(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    c.status(401);
    return c.text("Unauthorized");
  }
  const token = auth.split(" ")[1];
  try {
    const payload = await verify(token, (c.env as any).JWT_SECRET);
    if (!payload) {
      c.status(401);
      return c.text("Unauthorized");
    }
    const id = String((payload as any).id ?? "");
    const name = typeof (payload as any).name === "string" ? (payload as any).name : "Anonymous";
    const roleRaw = (payload as any).role;

    if (!id) {
      c.status(401);
      return c.text("Unauthorized");
    }
    if (!isRole(roleRaw)) {
      c.status(401);
      return c.text("Unauthorized");
    }
    c.set("userId", id);
    c.set("name", name);
    c.set("role", roleRaw as Role);

    await next();
  } catch {
    c.status(401);
    console.log("Error");
    return c.text("Unauthorized");
  }
});

location.get("/stream", (c) =>
  streamSSE(c, async (stream) => {
    const send = async (payload: unknown) =>
      stream.writeSSE({ data: JSON.stringify(payload) });

    subscribers.add(send);

    const hb = setInterval(() =>
      stream.writeSSE({ event: "heartbeat", data: String(Date.now()) }), 25000);

    await stream.writeSSE({ event: "hello", data: "connected" });
    await stream.writeSSE({
      data: JSON.stringify({ type: "snapshot", data: Array.from(latest.values()) }),
    });

    stream.onAbort(() => {
      clearInterval(hb);
      subscribers.delete(send);
    });
  })
);

location.get("/near", (c) => {
  const lat = Number(c.req.query("lat"));
  const lng = Number(c.req.query("lng"));
  const radiusQ = Number(c.req.query("radius") ?? 500);
  const radius = Number.isFinite(radiusQ) && radiusQ > 0 ? radiusQ : 500;
  const role = (c.get("role") as string | undefined)?.toLowerCase();
  if (!isNumber(lat) || !isNumber(lng))
    return c.json({ ok: false, error: "lat and lng required" }, 400);

  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const data = Array.from(latest.values())
    .filter((l) => !role || String(l.role).toLowerCase() === role)
    .map((l) => {
      const dLat = toRad(l.lat - lat);
      const dLng = toRad(l.lng - lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat)) * Math.cos(toRad(l.lat)) * Math.sin(dLng / 2) ** 2;
      const dist = 2 * R * Math.asin(Math.sqrt(a));
      return { ...l, distance: dist };
    })
    .filter((x) => x.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  return c.json({ ok: true, data });
});

location.get("/", (c) => {
  const role = (c.get("role") as string | undefined)?.toLowerCase();
  const rows = Array.from(latest.values()).filter(
    (l) => !role || String(l.role).toLowerCase() === role
  );
  rows.sort((a, b) => b.ts - a.ts);
  return c.json({ ok: true, data: rows });
});

location.get("/fetch", (c) => {
  const userIdFromToken = c.get("userId") as string;
  const loc = latest.get(userIdFromToken) || null;
  console.log(userIdFromToken);
  return c.json({ ok: true, data: loc });
});

location.post("/put", async (c) => {
  console.log("location post entered");

  const userIdFromToken = c.get("userId") as string;
  const nameFromToken = c.get("name") as string;
  const roleFromToken = c.get("role") as Role;

  const body = await c.req.json().catch(() => ({} as any));
  const { lat, lng, heading = null, speed = null, accuracy = null } = body;

  if (!isNumber(lat) || !isNumber(lng))
    return c.json({ ok: false, error: "lat/lng required" }, 400);

  const loc: Loc = {
    userId: userIdFromToken,
    name: nameFromToken,
    role: roleFromToken,
    lat,
    lng,
    heading: isNumber(heading) ? heading : null,
    speed: isNumber(speed) ? speed : null,
    accuracy: isNumber(accuracy) ? accuracy : null,
    ts: Date.now(),
  };

  latest.set(userIdFromToken, loc);
  await broadcast({ type: "location", data: loc });
  return c.json({ ok: true });
});