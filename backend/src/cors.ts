// src/cors.ts (or inline)
export const cors = async (c: any, next: any) => {
  const origin = c.req.header("Origin") || "";
  const acrh = c.req.header("Access-Control-Request-Headers") || "authorization, content-type";

  // 🔎 optional: debug in tail
  // console.log("CORS origin:", origin, "method:", c.req.method, "ACRH:", acrh);

  if (origin) {
    c.header("Access-Control-Allow-Origin", origin); // reflect exact origin
    c.header("Vary", "Origin");
    c.header("Access-Control-Allow-Credentials", "true"); // keep if using cookies; harmless otherwise
  }

  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", acrh);
  c.header("Access-Control-Max-Age", "86400");

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204); // short-circuit preflight
  }
  await next();
};
