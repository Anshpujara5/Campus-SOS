import { Link, NavLink } from "react-router-dom";
import { useSidebar } from "./sidebar";

export function Appbar() {
  const { openSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-40">
      {/* ---- Top bar (glassy gradient) ---- */}
      <div className="relative bg-[#0A0F17]">
        {/* gradient ribbon */}
        <div className="h-1 w-full bg-[repeating-linear-gradient(45deg,rgba(56,189,248,0.25)_0px,rgba(56,189,248,0.25)_10px,rgba(168,85,247,0.25)_10px,rgba(168,85,247,0.25)_20px)]" />
        <div className="relative border-b border-white/10 bg-[rgba(10,15,23,0.6)] backdrop-blur-xl">
          {/* top glossy line */}
          <div className="absolute -top-px inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />

          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 text-slate-100">
            {/* Brand */}
            <Link to="/foryou" className="group flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-white/5 ring-1 ring-white/15 backdrop-blur grid place-items-center">
                  <span className="text-[10px] font-bold tracking-wider">CS</span>
                </div>
                <div className="absolute -inset-0.5 -z-10 rounded-2xl opacity-0 blur-md transition group-hover:opacity-30 bg-sky-400/25" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-semibold tracking-[-0.01em]">Campus SOS</span>
                <span className="text-[11px] text-slate-300/70">safety • alerts • response</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              <NavItem to="/alerts" label="Alerts" />
              <NavItem to="/publish" label="Create" />
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link to="/publish" className="hidden sm:block">
                {/* <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.98]"
                >
                  New
                </button> */}
              </Link>

              <button
                onClick={openSidebar}
                aria-label="Account"
                title="Account"
                className="rounded-full p-0.5 ring-1 ring-white/10 hover:ring-white/25 transition"
              >
                <Avatar name="Ansh" size="big" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Sub bar (dark, slim) ---- */}
      <div className="border-b border-white/10 bg-[rgba(8,12,19,0.75)] backdrop-blur-lg">
        <div className="mx-auto flex h-10 max-w-6xl items-center justify-between px-4">
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-300">
            <Badge tone="info">Live</Badge>
            <span className="truncate text-slate-400">Campus network healthy</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <QuickLink to="/alerts" text="Feed" />
            <Dot />
            <QuickLink to="/publish" text="Report" />
          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------ Bits ------------------ */

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "relative mx-1 rounded-full px-3 py-2 text-sm transition",
          "text-slate-300 hover:text-slate-100",
          isActive && "text-slate-100",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {/* glowing underline on active */}
          <span
            className={[
              "absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full",
              "bg-gradient-to-r from-sky-300/80 via-fuchsia-300/80 to-sky-300/80",
              "shadow-[0_0_10px_1px_rgba(56,189,248,0.35)]",
              "transition-all origin-center",
              isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0",
            ].join(" ")}
          />
        </>
      )}
    </NavLink>
  );
}

function QuickLink({ to, text }: { to: string; text: string }) {
  return (
    <Link
      to={to}
      className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10 hover:bg-white/5 hover:text-slate-100 transition"
    >
      {text}
    </Link>
  );
}

function Badge({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "ok" | "warn";
}) {
  const map =
    tone === "ok"
      ? "bg-emerald-400/10 text-emerald-200 ring-emerald-400/20"
      : tone === "warn"
      ? "bg-amber-400/10 text-amber-200 ring-amber-400/20"
      : "bg-sky-400/10 text-sky-200 ring-sky-400/20";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 text-[11px] ${map}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current/70 shadow-[0_0_8px_var(--tw-ring-color)]" />
      {children}
    </span>
  );
}

function Dot() {
  return <span className="mx-1 w-1 h-1 rounded-full bg-slate-600 inline-block" />;
}

export function Avatar({
  name,
  size = "small",
}: {
  name: string;
  size?: "small" | "big";
}) {
  const dim = size === "small" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const initial = (name?.[0] || "?").toUpperCase();
  return (
    <div
      className={[
        "relative grid place-items-center rounded-full",
        "bg-gradient-to-b from-slate-800 to-slate-900",
        "text-slate-100 border border-white/10",
        "ring-1 ring-sky-500/20",
        "font-semibold",
        dim,
      ].join(" ")}
    >
      {initial}
      {/* online dot */}
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
      {/* soft inner glow */}
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(60%_60%_at_50%_30%,rgba(56,189,248,0.14),transparent)]" />
    </div>
  );
}