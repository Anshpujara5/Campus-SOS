import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "./Appbar";

/* ------------------ Context ------------------ */

type SidebarState = {
  open: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // lock page scroll behind the sheet
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev || "";
    return () => { document.body.style.overflow = prev || ""; };
  }, [open]);

  const value = useMemo(
    () => ({
      open,
      openSidebar: () => setOpen(true),
      closeSidebar: () => setOpen(false),
      toggleSidebar: () => setOpen(v => !v),
    }),
    [open]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
      <Sidebar />
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within <SidebarProvider>");
  return ctx;
}

/* ------------------ Utils ------------------ */

function parseJwtNameAndRole(): { name?: string; role?: string } {
  const token = localStorage.getItem("token") || "";
  const raw = token.replace(/^Bearer\s+/i, "");
  const parts = raw.split(".");
  if (parts.length !== 3) return {};
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return { name: payload?.name, role: payload?.role };
  } catch {
    return {};
  }
}

function RolePill({ role }: { role?: string }) {
  if (!role) return <span className="text-xs text-slate-400">ROLE</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[11px] text-sky-200">
      <span className="h-1.5 w-1.5 rounded-full bg-current/80" />
      {String(role).toUpperCase()}
    </span>
  );
}

/* ------------------ Sidebar (dark glass) ------------------ */

function Sidebar() {
  const { open, closeSidebar } = useSidebar();
  const { name, role } = parseJwtNameAndRole();
  const navigate = useNavigate();
  const firstFocus = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSidebar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeSidebar]);

  useEffect(() => {
    if (open && firstFocus.current) firstFocus.current.focus();
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* dimmed backdrop with slight blur & vignette */}
      <div
        className={[
          "absolute inset-0 transition-opacity duration-300",
          "backdrop-blur-[2px]",
          open ? "opacity-100" : "opacity-0",
          "bg-[radial-gradient(1200px_600px_at_70%_10%,rgba(56,189,248,0.12),transparent_60%)]",
          "bg-slate-950/70",
        ].join(" ")}
        onClick={closeSidebar}
      />

      {/* gradient frame */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidebarTitle"
        className={[
          "absolute right-0 top-0 h-full w-[380px] max-w-[92vw]",
          "p-[1px] rounded-l-2xl",
          "bg-gradient-to-b from-sky-400/40 via-fuchsia-400/30 to-transparent",
          "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)]",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* frosted panel */}
        <div className="h-full rounded-l-2xl bg-[rgba(10,15,23,0.8)] backdrop-blur-2xl border-l border-white/10">
          {/* header */}
          <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 id="sidebarTitle" className="text-base font-semibold text-slate-100 tracking-[-0.01em]">
              Account
            </h2>
            <button
              ref={firstFocus}
              onClick={closeSidebar}
              aria-label="Close"
              className="rounded-lg p-2 text-slate-300 hover:text-slate-100 hover:bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              ✕
            </button>
          </header>

          {/* content */}
          <div className="h-[calc(100%-56px)] overflow-y-auto px-5 py-5 space-y-6">
            {/* profile */}
            <div className="flex items-center gap-3">
              <Avatar name={name || "Ansh"} size="big" />
              <div className="min-w-0">
                <div className="text-slate-100 font-semibold truncate">{name || "Anonymous"}</div>
                <div className="mt-1"><RolePill role={role} /></div>
              </div>
            </div>

            {/* nav */}
            <nav className="space-y-1">
              <MenuItem onClick={() => { closeSidebar(); navigate("/alerts"); }}   icon="🔔" label="Alerts" />
              <MenuItem onClick={() => { closeSidebar(); navigate("/foryou"); }}  icon="🎯" label="For You" /> {/* NEW */}
              <MenuItem onClick={() => { closeSidebar(); navigate("/publish"); }}  icon="➕" label="Create Alert" />
              <MenuItem onClick={() => { closeSidebar(); navigate("/my-alerts"); }} icon="📦" label="My Alerts" />
              <MenuItem onClick={() => { closeSidebar(); navigate("/settings"); }}  icon="⚙️" label="Settings" />
            </nav>

            <div className="h-px bg-white/10 my-2" />

            <button
              onClick={() => {
                localStorage.removeItem("token");
                closeSidebar();
                navigate("/signin", { replace: true });
              }}
              className={[
                "w-full px-3 py-2 rounded-xl",
                "bg-white/5 text-slate-100 font-medium",
                "ring-1 ring-white/10 hover:bg-white/10 active:scale-[0.99] transition",
              ].join(" ")}
            >
              Sign out
            </button>

            <div className="text-[11px] text-slate-400 pt-2">v1.0 • Crowd Management</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ------------------ Bits ------------------ */

function MenuItem({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl",
        "text-slate-200 hover:text-slate-100",
        "bg-transparent hover:bg-white/5",
        "ring-1 ring-transparent hover:ring-white/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40",
        "transition",
      ].join(" ")}
    >
      <span className="text-base">{icon}</span>
      <span className="text-[15px]">{label}</span>
    </button>
  );
}


// import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { Avatar } from "./Appbar";

// /* ------------------ Context ------------------ */

// type SidebarState = {
//   open: boolean;
//   openSidebar: () => void;
//   closeSidebar: () => void;
//   toggleSidebar: () => void;
// };

// const SidebarContext = createContext<SidebarState | null>(null);

// export function SidebarProvider({ children }: { children: React.ReactNode }) {
//   const [open, setOpen] = useState(false);

//   // lock page scroll behind the sheet
//   useEffect(() => {
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = open ? "hidden" : prev || "";
//     return () => { document.body.style.overflow = prev || ""; };
//   }, [open]);

//   const value = useMemo(
//     () => ({
//       open,
//       openSidebar: () => setOpen(true),
//       closeSidebar: () => setOpen(false),
//       toggleSidebar: () => setOpen(v => !v),
//     }),
//     [open]
//   );

//   return (
//     <SidebarContext.Provider value={value}>
//       {children}
//       <Sidebar />
//     </SidebarContext.Provider>
//   );
// }

// export function useSidebar() {
//   const ctx = useContext(SidebarContext);
//   if (!ctx) throw new Error("useSidebar must be used within <SidebarProvider>");
//   return ctx;
// }

// /* ------------------ Utils ------------------ */

// function parseJwtNameAndRole(): { name?: string; role?: string } {
//   const token = localStorage.getItem("token") || "";
//   const raw = token.replace(/^Bearer\s+/i, "");
//   const parts = raw.split(".");
//   if (parts.length !== 3) return {};
//   try {
//     const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
//     return { name: payload?.name, role: payload?.role };
//   } catch {
//     return {};
//   }
// }

// function RolePill({ role }: { role?: string }) {
//   if (!role) return <span className="text-xs text-slate-400">ROLE</span>;
//   return (
//     <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[11px] text-sky-200">
//       <span className="h-1.5 w-1.5 rounded-full bg-current/80" />
//       {String(role).toUpperCase()}
//     </span>
//   );
// }

// /* ------------------ Sidebar (dark glass) ------------------ */

// function Sidebar() {
//   const { open, closeSidebar } = useSidebar();
//   const { name, role } = parseJwtNameAndRole();
//   const navigate = useNavigate();
//   const firstFocus = useRef<HTMLButtonElement | null>(null);

//   useEffect(() => {
//     function onKey(e: KeyboardEvent) {
//       if (e.key === "Escape") closeSidebar();
//     }
//     document.addEventListener("keydown", onKey);
//     return () => document.removeEventListener("keydown", onKey);
//   }, [closeSidebar]);

//   useEffect(() => {
//     if (open && firstFocus.current) firstFocus.current.focus();
//   }, [open]);

//   return (
//     <div
//       className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
//       aria-hidden={!open}
//     >
//       {/* dimmed backdrop with slight blur & vignette */}
//       <div
//         className={[
//           "absolute inset-0 transition-opacity duration-300",
//           "backdrop-blur-[2px]",
//           open ? "opacity-100" : "opacity-0",
//           "bg-[radial-gradient(1200px_600px_at_70%_10%,rgba(56,189,248,0.12),transparent_60%)]",
//           "bg-slate-950/70",
//         ].join(" ")}
//         onClick={closeSidebar}
//       />

//       {/* gradient frame */}
//       <aside
//         role="dialog"
//         aria-modal="true"
//         aria-labelledby="sidebarTitle"
//         className={[
//           "absolute right-0 top-0 h-full w-[380px] max-w-[92vw]",
//           "p-[1px] rounded-l-2xl",
//           "bg-gradient-to-b from-sky-400/40 via-fuchsia-400/30 to-transparent",
//           "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)]",
//           "transition-transform duration-300 ease-out",
//           open ? "translate-x-0" : "translate-x-full",
//         ].join(" ")}
//       >
//         {/* frosted panel */}
//         <div className="h-full rounded-l-2xl bg-[rgba(10,15,23,0.8)] backdrop-blur-2xl border-l border-white/10">
//           {/* header */}
//           <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
//             <h2 id="sidebarTitle" className="text-base font-semibold text-slate-100 tracking-[-0.01em]">
//               Account
//             </h2>
//             <button
//               ref={firstFocus}
//               onClick={closeSidebar}
//               aria-label="Close"
//               className="rounded-lg p-2 text-slate-300 hover:text-slate-100 hover:bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition"
//             >
//               ✕
//             </button>
//           </header>

//           {/* content */}
//           <div className="h-[calc(100%-56px)] overflow-y-auto px-5 py-5 space-y-6">
//             {/* profile */}
//             <div className="flex items-center gap-3">
//               <Avatar name={name || "Ansh"} size="big" />
//               <div className="min-w-0">
//                 <div className="text-slate-100 font-semibold truncate">{name || "Anonymous"}</div>
//                 <div className="mt-1"><RolePill role={role} /></div>
//               </div>
//             </div>

//             {/* nav */}
//             <nav className="space-y-1">
//               <MenuItem onClick={() => { closeSidebar(); navigate("/alerts"); }} icon="🔔" label="Alerts" />
//               <MenuItem onClick={() => { closeSidebar(); navigate("/publish"); }} icon="➕" label="Create Alert" />
//               <MenuItem onClick={() => { closeSidebar(); navigate("/my-alerts"); }} icon="📦" label="My Alerts" />
//               <MenuItem onClick={() => { closeSidebar(); navigate("/settings"); }} icon="⚙️" label="Settings" />
//             </nav>

//             <div className="h-px bg-white/10 my-2" />

//             <button
//               onClick={() => {
//                 localStorage.removeItem("token");
//                 closeSidebar();
//                 navigate("/signin", { replace: true });
//               }}
//               className={[
//                 "w-full px-3 py-2 rounded-xl",
//                 "bg-white/5 text-slate-100 font-medium",
//                 "ring-1 ring-white/10 hover:bg-white/10 active:scale-[0.99] transition",
//               ].join(" ")}
//             >
//               Sign out
//             </button>

//             <div className="text-[11px] text-slate-400 pt-2">v1.0 • Crowd Management</div>
//           </div>
//         </div>
//       </aside>
//     </div>
//   );
// }

// /* ------------------ Bits ------------------ */

// function MenuItem({
//   onClick,
//   label,
//   icon,
// }: {
//   onClick: () => void;
//   label: string;
//   icon?: string;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className={[
//         "w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl",
//         "text-slate-200 hover:text-slate-100",
//         "bg-transparent hover:bg-white/5",
//         "ring-1 ring-transparent hover:ring-white/10",
//         "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40",
//         "transition",
//       ].join(" ")}
//     >
//       <span className="text-base">{icon}</span>
//       <span className="text-[15px]">{label}</span>
//     </button>
//   );
// }
