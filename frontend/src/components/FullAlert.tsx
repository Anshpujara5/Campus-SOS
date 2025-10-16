import type { InnerAlert } from "../hooks";
import { Appbar, Avatar } from "./Appbar";

const TZ = "Asia/Kolkata";

/* ---------- time helpers ---------- */
function formatIST(iso?: string) {
  if (!iso) return { label: "—", rel: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { label: "—", rel: "" };

  const date = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(d);

  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  }).format(d);

  const label = `${date} • ${time} IST`;

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  const rel =
    Math.abs(mins) < 60
      ? rtf.format(-mins, "minute")
      : Math.abs(mins) < 1440
      ? rtf.format(-Math.round(mins / 60), "hour")
      : rtf.format(-Math.round(mins / 1440), "day");

  return { label, rel };
}

export function cap(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- chip styles ---------- */
// Issuer (who raised it): filled/tinted
export const typeChip: Record<string, string> = {
  student:  "bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20",
  security: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20",
  driver:   "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
  faculty:  "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20",
};

// Status: filled/tinted
export const statusChip: Record<string, string> = {
  active:    "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/20",
  resolved:  "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
  dismissed: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/20",
};

// Calling audience (outlined look)
const callChip: Record<string, string> = {
  student:  "bg-blue-500/10 text-blue-200 ring-1 ring-blue-400/50",
  security: "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/50",
  driver:   "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/50",
  faculty:  "bg-violet-500/10 text-violet-200 ring-1 ring-violet-400/50",
};

function Dot() {
  return <span className="mx-1 w-1 h-1 rounded-full bg-slate-500 inline-block" />;
}

/* ---------- normalize callTo -> array ---------- */
function normalizeCallTo(callTo?: unknown): string[] {
  if (!callTo) return [];
  const list = Array.isArray(callTo) ? callTo : [callTo];
  const valid = new Set(["student", "security", "driver", "faculty"]);
  return list
    .map((x) => String(x).toLowerCase())
    .filter((x) => valid.has(x));
}

/* ---------- BIG calling badge (moved below title) ---------- */
function CallingBadge({ role }: { role: string }) {
  const base =
    callChip[role] ||
    "bg-slate-700/30 text-slate-300 ring-1 ring-slate-600/50";
  const isStudent = role === "student";
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5",
        "transition",
        // size: slightly larger; bump Student a bit more
        isStudent ? "text-sm font-semibold" : "text-[13px] font-medium",
        base,
      ].join(" ")}
      title={`Calling: ${cap(role)}`}
    >
      <span aria-hidden className="text-[13px] leading-none">📣</span>
      {cap(role)}
    </span>
  );
}

/* ---------- Component ---------- */
export const FullAlert = ({ alert }: { alert: InnerAlert }) => {
  const author = alert.createdByName || "Anonymous";
  const { label: when, rel } = formatIST(alert.createdAt as unknown as string);
  const status = (alert as any).status || "active";
  const issuer = (alert as any).type;
  const callToList = normalizeCallTo((alert as any).callTo);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <Appbar />

      <main className="px-4 pb-12">
        <div className="mx-auto w-full max-w-3xl pt-10">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.7)] ring-1 ring-white/5">
            {/* decor */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-3xl" />
            <div className="absolute -bottom-20 -left-28 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl" />

            <div className="relative p-6 sm:p-8">
              {/* header chips (status + issuer) */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 text-[11px] sm:text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide ${
                    statusChip[status] ||
                    "bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/40"
                  }`}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current/70" />
                  {cap(status)}
                </span>

                {/* Issuer (filled) */}
                <span
                  className={`inline-flex items-center gap-2 text-[11px] sm:text-xs px-3 py-1 rounded-full ${
                    typeChip[issuer] ||
                    "bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/40"
                  }`}
                  title="Raised by"
                >
                  {cap(issuer)}
                </span>
              </div>

              {/* title */}
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-50">
                {alert.title || "Untitled"}
              </h1>

              {/* NEW: Calling row directly below title */}
              {callToList.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Calling</span>
                  <div className="flex flex-wrap gap-2">
                    {callToList.map((r) => (
                      <CallingBadge key={r} role={r} />
                    ))}
                  </div>
                </div>
              )}

              {/* meta */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <Avatar size="big" name={author} />
                  <span className="font-medium text-slate-100">{author}</span>
                </span>
                <Dot />
                <span className="text-slate-400" title={when}>
                  {when}
                  {rel ? ` (${rel})` : ""}
                </span>
              </div>

              <div className="mt-6 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

              {/* body */}
              <article className="prose prose-invert prose-slate max-w-none">
                <p className="mt-6 text-lg leading-relaxed text-slate-200 whitespace-pre-wrap">
                  {alert.message}
                </p>
              </article>

              {/* actions */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-xl bg-slate-50 text-slate-900 text-sm font-medium px-4 py-2 transition hover:bg-white active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300"
                  onClick={() => window.history.back()}
                >
                  Back
                </button>
                <button className="rounded-xl bg-slate-800 text-slate-100 text-sm font-medium px-4 py-2 ring-1 ring-white/10 hover:bg-slate-700 transition">
                  Share
                </button>
              </div>
            </div>

            {/* footer */}
            <div className="border-t border-white/10 bg-slate-900/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <div className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>All systems nominal</span>
                </div>
                <Dot />
                <span>Last updated: {when}</span>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-6 text-center text-xs text-slate-500">
            Crowd Management • {cap(issuer)} alert
            {callToList.length > 0 && (
              <>
                {" • Calling: "}
                {callToList.map(cap).join(", ")}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};


// import type { InnerAlert } from "../hooks";
// import { Appbar, Avatar } from "./Appbar";

// const TZ = "Asia/Kolkata";

// function formatIST(iso?: string) {
//   if (!iso) return { label: "—", rel: "" };
//   const d = new Date(iso);
//   if (isNaN(d.getTime())) return { label: "—", rel: "" };
//   const date = new Intl.DateTimeFormat("en-IN", {
//     weekday: "short",
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: TZ,
//   }).format(d);
//   const time = new Intl.DateTimeFormat("en-IN", {
//     hour: "numeric",
//     minute: "2-digit",
//     hour12: true,
//     timeZone: TZ,
//   }).format(d);
//   const label = `${date} • ${time} IST`;
//   const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
//   const diff = Date.now() - d.getTime();
//   const mins = Math.round(diff / 60000);
//   const rel =
//     Math.abs(mins) < 60
//       ? rtf.format(-mins, "minute")
//       : Math.abs(mins) < 1440
//       ? rtf.format(-Math.round(mins / 60), "hour")
//       : rtf.format(-Math.round(mins / 1440), "day");
//   return { label, rel };
// }

// export function cap(s?: string) {
//   if (!s) return "";
//   return s.charAt(0).toUpperCase() + s.slice(1);
// }

// // Dark-friendly chips (soft fills + clear text)
// export const typeChip: Record<string, string> = {
//   student:  "bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20",
//   security: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20",
//   driver:   "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
//   faculty:  "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20",
// };

// export const statusChip: Record<string, string> = {
//   active:    "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/20",
//   resolved:  "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
//   dismissed: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/20",
// };

// function Dot() {
//   return <span className="mx-1 w-1 h-1 rounded-full bg-slate-500 inline-block" />;
// }

// export const FullAlert = ({ alert }: { alert: InnerAlert }) => {
//   const author = alert.createdByName || "Anonymous";
//   const { label: when, rel } = formatIST(alert.createdAt as unknown as string);
//   const status = (alert as any).status || "active";

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
//       <Appbar />

//       <main className="px-4 pb-12">
//         <div className="mx-auto w-full max-w-3xl pt-10">
//           <div className="relative overflow-hidden rounded-3xl bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.7)] ring-1 ring-white/5">
//             <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-3xl" />
//             <div className="absolute -bottom-20 -left-28 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl" />

//             <div className="relative p-6 sm:p-8">
//               <div className="mb-6 flex flex-wrap items-center gap-3">
//                 <span
//                   className={`inline-flex items-center gap-2 text-[11px] sm:text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide ${statusChip[status] || "bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/40"}`}
//                 >
//                   <span className="inline-block h-1.5 w-1.5 rounded-full bg-current/70" />
//                   {cap(status)}
//                 </span>

//                 <span
//                   className={`inline-flex items-center gap-2 text-[11px] sm:text-xs px-3 py-1 rounded-full ${typeChip[alert.type] || "bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/40"}`}
//                 >
//                   {cap(alert.type)}
//                 </span>
//               </div>

//               <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-50">
//                 {alert.title || "Untitled"}
//               </h1>

//               <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
//                 <span className="inline-flex items-center gap-2">
//                   <Avatar size="big" name={author} />
//                   <span className="font-medium text-slate-100">{author}</span>
//                 </span>
//                 <Dot />
//                 <span className="text-slate-400" title={when}>
//                   {when}
//                   {rel ? ` (${rel})` : ""}
//                 </span>
//               </div>

//               <div className="mt-6 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

//               <article className="prose prose-invert prose-slate max-w-none">
//                 <p className="mt-6 text-lg leading-relaxed text-slate-200 whitespace-pre-wrap">
//                   {alert.message}
//                 </p>
//               </article>

//               <div className="mt-8 flex flex-wrap items-center gap-3">
//                 <button
//                   className="rounded-xl bg-slate-50 text-slate-900 text-sm font-medium px-4 py-2 transition hover:bg-white active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300"
//                   onClick={() => window.history.back()}
//                 >
//                   Back
//                 </button>
//                 <button className="rounded-xl bg-slate-800 text-slate-100 text-sm font-medium px-4 py-2 ring-1 ring-white/10 hover:bg-slate-700 transition">
//                   Share
//                 </button>
//               </div>
//             </div>

//             <div className="border-t border-white/10 bg-slate-900/60 p-4 sm:p-5">
//               <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
//                 <div className="inline-flex items-center gap-2">
//                   <span className="h-2 w-2 rounded-full bg-emerald-400" />
//                   <span>All systems nominal</span>
//                 </div>
//                 <Dot />
//                 <span>Last updated: {when}</span>
//               </div>
//             </div>
//           </div>

//           <div className="mx-auto mt-6 text-center text-xs text-slate-500">
//             Crowd Management • {cap(alert.type)} alert
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// };
