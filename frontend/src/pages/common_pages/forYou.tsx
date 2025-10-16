import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../config";
import { Appbar } from "../../components/Appbar";
import { AlertCard, type AlertRole } from "../../components/alertCard";
import { Link } from "react-router-dom";

/* ---------------- Types ---------------- */
type Status = "active" | "resolved" | "draft" | string;

type ApiAlert = {
  id?: string | number;
  _id?: string;
  alertId?: string | number;

  title?: string;
  heading?: string;

  message?: string;
  content?: string;
  body?: string;

  publishedDate?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  timestamp?: string | number;

  authorName?: string;
  author?: string;
  createdBy?: string;
  createdByName?: string;
  type?: string;              // issuer role
  role?: string;              // legacy
  callTo?: string | string[]; // targeted audience

  status?: Status;
  state?: string;
  phase?: string;
};

type AlertItem = {
  id: string;
  title: string;
  content: string;
  publishedDate?: string;
  authorName: string;
  role?: AlertRole;        // issuer
  callTo?: AlertRole[];    // audience (normalized array)
  status?: Status;
};

/* ---------------- Utils ---------------- */
function parseJwtRole(): AlertRole | undefined {
  try {
    const token = localStorage.getItem("token") || "";
    const raw = token.replace(/^Bearer\s+/i, "");
    const parts = raw.split(".");
    if (parts.length !== 3) return;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const r = String(payload?.role ?? "").toLowerCase();
    if (r === "student" || r === "security" || r === "driver" || r === "faculty") return r;
  } catch {}
}

function normalizeRole(role: any): AlertRole | undefined {
  const r = String(role ?? "").toLowerCase();
  return r === "student" || r === "security" || r === "driver" || r === "faculty" ? (r as AlertRole) : undefined;
}

function normalizeCallTo(v: any): AlertRole[] | undefined {
  if (v == null) return undefined; // treat missing as "everyone"
  const list = Array.isArray(v) ? v : [v];
  const set = new Set(["student", "security", "driver", "faculty"]);
  const out = list
    .map((r) => String(r).toLowerCase())
    .filter((r) => set.has(r)) as AlertRole[];
  return out.length ? out : undefined;
}

function normalizeAlert(x: ApiAlert): AlertItem {
  const id = String(x.id ?? x._id ?? x.alertId ?? Math.random().toString(36).slice(2, 10));
  const title = String(x.title ?? x.heading ?? "Untitled");
  const content = String(x.message ?? x.content ?? x.body ?? "");

  const created =
    x.createdAt instanceof Date ? x.createdAt.toISOString()
      : typeof x.createdAt === "string" ? x.createdAt
      : typeof x.timestamp === "number" ? new Date(x.timestamp).toISOString()
      : x.updatedAt instanceof Date ? x.updatedAt.toISOString()
      : typeof x.updatedAt === "string" ? x.updatedAt
      : x.publishedDate || undefined;

  const authorName = String(x.createdByName ?? x.authorName ?? x.author ?? x.createdBy ?? "Ansh");
  const role = normalizeRole(x.type ?? x.role);
  const status = (x.status ?? x.state ?? x.phase ?? "active") as Status;
  const callTo = normalizeCallTo(x.callTo);

  return { id, title, content, publishedDate: created, authorName, role, status, callTo };
}

/* ---------------- Page ---------------- */
export default function ForYou() {
  const myRole = parseJwtRole(); // e.g., "student"
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Your backend already filters by the user role from auth middleware.
        const res = await axios.get(`${BACKEND_URL}/api/v1/alert/forYou`, {
          headers: { Authorization: localStorage.getItem("token") || "" },
        });

        // Accept array or wrapped object { alerts: [...] }
        const raw = Array.isArray(res.data) ? res.data : res.data?.alerts ?? res.data?.data;
        const list: ApiAlert[] = Array.isArray(raw) ? raw : [];

        if (!alive) return;
        setAlerts(list.map(normalizeAlert));
        if (list.length === 0) setErr("No alerts were returned by the server.");
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || "Couldn’t load your alerts.");
        setAlerts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Client-side filters for text + status. Role filtering is already server-side.
  const shown = useMemo(() => {
    const text = q.trim().toLowerCase();
    return alerts
      .filter((a) => (status === "all" ? true : (a.status || "active") === status))
      .filter((a) => !text || a.title.toLowerCase().includes(text) || a.content.toLowerCase().includes(text));
  }, [alerts, q, status]);
  return (
    <div className="min-h-screen relative bg-[#070B12] text-slate-100">
      <Appbar />

      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(56,189,248,0.10),transparent_60%)]" />
        <div className="absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_35%,black,transparent)] bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-20">
        {/* header */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.01em]">For You</h1>
            <p className="text-sm text-slate-400">
              Showing alerts called for {myRole ?? "your role"}.
            </p>
          </div>
          <Link
            to="/publish"
            className="rounded-full px-4 py-2 text-sm font-medium bg-white/5 text-slate-100 ring-1 ring-white/10 hover:bg-white/10 transition"
          >
            New Alert
          </Link>
        </div>

        {/* controls */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or text…"
              className="w-full rounded-xl bg-white/5 text-slate-100 placeholder:text-slate-500 px-4 py-2.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            />
          </div>
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl bg-white/5 text-slate-100 px-4 py-2.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* errors */}
        {err && (
          <div className="mt-6 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            {err}
          </div>
        )}

        {/* list */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <SkeletonList />
          ) : shown.length === 0 ? (
            <EmptyState role={myRole} />
          ) : (
            shown.map((a) => (
              <AlertCard
                key={a.id}
                id={a.id}
                title={a.title}
                content={a.content}
                publishedDate={a.publishedDate}
                authorName={a.authorName}
                role={a.role}
                callTo={a.callTo}
                // @ts-ignore — AlertCard accepts string status
                status={a.status || "active"}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI Bits ---------------- */
function SkeletonList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-[1px] bg-gradient-to-b from-sky-400/20 via-fuchsia-400/15 to-transparent"
        >
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 animate-pulse">
            <div className="h-4 w-20 bg-white/10 rounded mb-3" />
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-full bg-white/10" />
              <div className="h-3 w-24 bg-white/10 rounded" />
              <div className="h-3 w-28 bg-white/10 rounded" />
            </div>
            <div className="h-5 w-3/4 bg-white/10 rounded mb-2" />
            <div className="h-4 w-2/3 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ role }: { role?: AlertRole }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
      <div className="text-slate-300">
        {role ? `No alerts found for ${role}.` : "No alerts found."}
      </div>
      <p className="text-sm text-slate-500 mt-1">When new alerts target your role, they’ll show up here.</p>
      <Link
        to="/alerts"
        className="inline-block mt-4 rounded-full px-4 py-2 text-sm font-medium bg-white/5 text-slate-100 ring-1 ring-white/10 hover:bg-white/10 transition"
      >
        Go to Feed
      </Link>
    </div>
  );
}
