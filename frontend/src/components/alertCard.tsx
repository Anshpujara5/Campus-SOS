import { Link } from "react-router-dom";
import { cap, statusChip as fullStatusChip } from "./FullAlert";

export type AlertRole = "student" | "security" | "driver" | "faculty";

export interface AlertCardProps {
  id: string;
  title: string;
  content: string;
  publishedDate?: string;
  authorName: string;
  role?: AlertRole;                          // issuer
  callTo?: AlertRole | AlertRole[];          // ⬅️ NEW: who this alert calls
  status?: "active" | "resolved" | "draft" | string;
}

/* -------- time helpers -------- */
const IST_TZ = "Asia/Kolkata";
const fmtDate = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: IST_TZ });
const fmtTime = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST_TZ });

function formatIST(iso?: string) {
  if (!iso) return { label: "—", rel: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { label: "—", rel: "" };
  const label = `${fmtDate.format(d)} • ${fmtTime.format(d)} IST`;
  const rel = timeAgo(d);
  return { label, rel };
}
function timeAgo(date: Date) {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  if (Math.abs(sec) < 60) return rtf.format(-sec, "second");
  const min = Math.round(sec / 60);
  if (Math.abs(min) < 60) return rtf.format(-min, "minute");
  const hrs = Math.round(min / 60);
  if (Math.abs(hrs) < 24) return rtf.format(-hrs, "hour");
  const days = Math.round(hrs / 24);
  if (Math.abs(days) < 7) return rtf.format(-days, "day");
  const weeks = Math.round(days / 7);
  if (Math.abs(weeks) < 5) return rtf.format(-weeks, "week");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(-months, "month");
  const years = Math.round(days / 365);
  return rtf.format(-years, "year");
}
function readingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

/* -------- tokens -------- */
const localStatusChip: Record<string, string> = {
  active:   "bg-emerald-400/10 text-emerald-200 border-emerald-400/25",
  resolved: "bg-sky-400/10 text-sky-200 border-sky-400/25",
  draft:    "bg-zinc-400/10 text-zinc-200 border-zinc-400/25",
};

function RoleBadge({ role }: { role: AlertRole }) {
  const map = {
    student:  "bg-blue-400/10 text-blue-200 border-blue-400/25",
    security: "bg-amber-400/10 text-amber-200 border-amber-400/25",
    driver:   "bg-emerald-400/10 text-emerald-200 border-emerald-400/25",
    faculty:  "bg-violet-400/10 text-violet-200 border-violet-400/25",
  } as const;
  const label = cap(role);
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${map[role]}`}>{label}</span>;
}

/* Calling chips (outlined so they differ from issuer chip) */
const callChip: Record<string, string> = {
  student:  "bg-transparent text-blue-200 border border-blue-400/40 hover:bg-blue-500/10",
  security: "bg-transparent text-amber-200 border border-amber-400/40 hover:bg-amber-500/10",
  driver:   "bg-transparent text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/10",
  faculty:  "bg-transparent text-violet-200 border border-violet-400/40 hover:bg-violet-500/10",
};
function CallingBadge({ role }: { role: AlertRole }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full transition ${callChip[role] || "border border-slate-600/40 text-slate-300"}`}>
      <span aria-hidden className="text-[11px] leading-none">📣</span>
      {cap(role)}
    </span>
  );
}
function normalizeCallTo(v?: AlertRole | AlertRole[]) {
  const list = !v ? [] : Array.isArray(v) ? v : [v];
  const valid = new Set<AlertRole>(["student","security","driver","faculty"]);
  return list.filter((x) => valid.has(x));
}

/* -------- UI -------- */
export const AlertCard = ({
  id,
  title,
  content,
  publishedDate,
  authorName,
  role,
  callTo,                     // ⬅️ NEW
  status = "active",
}: AlertCardProps) => {
  const { label, rel } = formatIST(publishedDate);
  const rtime = readingTime(content);
  const statusClass =
    (fullStatusChip && (fullStatusChip as any)[status]) ||
    localStatusChip[status] ||
    "bg-zinc-400/10 text-zinc-200 border-zinc-400/25";

  const callList = normalizeCallTo(callTo);

  return (
    <Link to={`/alert/${id}`} aria-label={`Open alert ${title}`} className="block">
      {/* gradient frame */}
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-sky-400/40 via-fuchsia-400/30 to-transparent shadow-[0_10px_40px_-10px_rgba(2,8,23,0.7)] hover:from-sky-400/70 hover:via-fuchsia-400/50 transition-all duration-300">
        {/* frosted inner */}
        <div className="rounded-2xl bg-[rgba(9,14,22,0.75)] backdrop-blur-xl border border-white/10">
          {/* top halo */}
          <div className="absolute -top-px inset-x-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />

          <div className="relative p-5 sm:p-6">
            {/* status */}
            <div className="mb-3">
              <span className={`inline-block text-[10px] sm:text-xs px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wide ${statusClass}`}>
                {cap(status)}
              </span>
            </div>

            {/* meta */}
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-300">
              <Avatar name={authorName} />
              <span className="font-medium text-slate-100">{authorName}</span>
              {role && (<><Dot /><RoleBadge role={role} /></>)}

              {/* Calling */}
              {callList.length > 0 && (
                <>
                  <Dot />
                  <span className="text-[11px] text-slate-400">Calling:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {callList.map((r) => <CallingBadge key={r} role={r} />)}
                  </div>
                </>
              )}

              <Dot />
              <span className="text-slate-400/90" title={label}>{label}</span>
              {rel && (<><Dot /><span className="text-slate-500">{rel}</span></>)}
            </div>

            {/* title */}
            <h3 className="text-[20px] sm:text-[22px] font-semibold mt-2 text-slate-50 tracking-[-0.01em] leading-snug group-hover:underline underline-offset-4 decoration-sky-300/50 line-clamp-2">
              {title}
            </h3>

            {/* excerpt */}
            <p className="text-slate-300/90 text-[14.5px] mt-2 leading-6 line-clamp-3">
              {content}
            </p>

            {/* footer */}
            <div className="mt-4 text-xs text-slate-400">{rtime}</div>
          </div>

          {/* edge glow on hover */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300"
            style={{ boxShadow: "inset 0 0 80px 0 rgba(56,189,248,0.06)" }}
          />
        </div>
      </div>
    </Link>
  );
};

function Dot() {
  return <span className="mx-1 w-1 h-1 rounded-full bg-slate-600 inline-block" />;
}

export function Avatar({ name, size = "small" }: { name: string; size?: "small" | "big" }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  const dim = size === "small" ? "w-7 h-7 text-xs" : "w-10 h-10 text-base";
  return (
    <div className={`relative inline-flex items-center justify-center overflow-hidden rounded-full ${dim} bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10`}>
      <span className="font-semibold text-slate-100">{initial}</span>
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(60%_60%_at_50%_30%,rgba(56,189,248,0.14),transparent)]" />
    </div>
  );
}