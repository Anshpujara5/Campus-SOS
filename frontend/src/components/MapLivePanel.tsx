// src/components/MapLivePanel.tsx
import { useMemo } from "react";
import clsx from "clsx";

export type LiveCounts = { amb: number; ev: number; stu: number; all: number };

type MapLivePanelProps = {
  counts: LiveCounts;

  showAmb: boolean;
  showEv: boolean;
  showStu: boolean;
  onToggleAmb: () => void;
  onToggleEv: () => void;
  onToggleStu: () => void;

  query: string;
  onQueryChange: (v: string) => void;

  follow: boolean;
  onToggleFollow: () => void;

  lastUpdated?: Date | null;
  className?: string;
  forceDark?: boolean;
};

export default function MapLivePanel({
  counts,
  showAmb,
  showEv,
  showStu,
  onToggleAmb,
  onToggleEv,
  onToggleStu,
  query,
  onQueryChange,
  follow,
  onToggleFollow,
  lastUpdated,
  className,
  forceDark,
}: MapLivePanelProps) {
  const rootCls = clsx(
    "glass elev-1 rounded-2xl p-3 border border-black/5 dark:border-white/10",
    forceDark && "dark",
    className
  );

  const tsText = useMemo(
    () =>
      lastUpdated
        ? `Last update: ${lastUpdated.toLocaleTimeString()}`
        : "Waiting for data…",
    [lastUpdated]
  );

  return (
    <div className={rootCls}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold muted">Live on Campus</div>
        <span className="text-xs muted">{counts.all} online</span>
      </div>

      {/* Role chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onToggleAmb}
          className={clsx(
            "chip px-3 py-1.5 text-sm shadow-sm transition",
            showAmb ? "bg-blue-600 text-white" : "chip-off"
          )}
          title="Toggle Ambulance"
        >
          🚑 Ambulance <span className="opacity-80">({counts.amb})</span>
        </button>

        <button
          onClick={onToggleEv}
          className={clsx(
            "chip px-3 py-1.5 text-sm shadow-sm transition",
            showEv ? "bg-violet-600 text-white" : "chip-off"
          )}
          title="Toggle EV Drivers"
        >
          🛵 EV <span className="opacity-80">({counts.ev})</span>
        </button>

        <button
          onClick={onToggleStu}
          className={clsx(
            "chip px-3 py-1.5 text-sm shadow-sm transition",
            showStu ? "bg-green-600 text-white" : "chip-off"
          )}
          title="Toggle Students"
        >
          🧑‍🎓 Students <span className="opacity-80">({counts.stu})</span>
        </button>
      </div>

      {/* Search + Auto-fit */}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search name or ID…"
          className="field w-52 md:w-64 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/60"
        />
        <label className="flex items-center gap-1.5 text-xs muted">
          <input type="checkbox" checked={follow} onChange={onToggleFollow} />
          Auto-fit
        </label>
      </div>

      {/* Timestamp */}
      <div className="mt-2 text-[11px] muted">{tsText}</div>
    </div>
  );
}


// // src/components/MapLivePanel.tsx
// import { useMemo } from "react";
// import clsx from "clsx";

// export type LiveCounts = { amb: number; ev: number; stu: number; all: number };

// type MapLivePanelProps = {
//   counts: LiveCounts;
//   showAmb: boolean;
//   showEv: boolean;
//   showStu: boolean;
//   onToggleAmb: () => void;
//   onToggleEv: () => void;
//   onToggleStu: () => void;

//   query: string;
//   onQueryChange: (v: string) => void;

//   follow: boolean;
//   onToggleFollow: () => void;

//   locate: boolean;
//   onToggleLocate: () => void;

//   lastUpdated?: Date | null;

//   /** Optional extra classes or positioning */
//   className?: string;

//   /** If you don’t use Tailwind’s `dark` class globally, force dark here */
//   forceDark?: boolean;
// };

// export default function MapLivePanel(props: MapLivePanelProps) {
//   const {
//     counts,
//     showAmb, showEv, showStu,
//     onToggleAmb, onToggleEv, onToggleStu,
//     query, onQueryChange,
//     follow, onToggleFollow,
//     locate, onToggleLocate,
//     lastUpdated,
//     className,
//     forceDark,
//   } = props;

//   const rootCls = clsx(
//     "glass elev-1 rounded-2xl p-3 border border-black/5 dark:border-white/10",
//     forceDark && "dark",
//     className
//   );

//   const tsText = useMemo(
//     () => (lastUpdated ? `Last update: ${lastUpdated.toLocaleTimeString()}` : "Waiting for data…"),
//     [lastUpdated]
//   );

//   return (
//     <div className={rootCls}>
//       {/* Header */}
//       <div className="mb-2 flex items-center justify-between gap-3">
//         <div className="text-sm font-semibold muted">Live on Campus</div>
//         <span className="text-xs muted">{counts.all} online</span>
//       </div>

//       {/* Role chips */}
//       <div className="flex flex-wrap gap-2">
//         <button
//           onClick={onToggleAmb}
//           className={clsx(
//             "chip px-3 py-1.5 text-sm shadow-sm transition",
//             showAmb ? "bg-blue-600 text-white" : "chip-off"
//           )}
//           title="Toggle Ambulance"
//         >
//           🚑 Ambulance <span className="opacity-80">({counts.amb})</span>
//         </button>

//         <button
//           onClick={onToggleEv}
//           className={clsx(
//             "chip px-3 py-1.5 text-sm shadow-sm transition",
//             showEv ? "bg-violet-600 text-white" : "chip-off"
//           )}
//           title="Toggle EV Drivers"
//         >
//           🛵 EV <span className="opacity-80">({counts.ev})</span>
//         </button>

//         <button
//           onClick={onToggleStu}
//           className={clsx(
//             "chip px-3 py-1.5 text-sm shadow-sm transition",
//             showStu ? "bg-green-600 text-white" : "chip-off"
//           )}
//           title="Toggle Students"
//         >
//           🧑‍🎓 Students <span className="opacity-80">({counts.stu})</span>
//         </button>
//       </div>

//       {/* Search + toggles */}
//       <div className="mt-3 flex items-center gap-2">
//         <input
//           value={query}
//           onChange={(e) => onQueryChange(e.target.value)}
//           placeholder="Search name or ID…"
//           className="field w-52 md:w-64 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/60"
//         />
//         <label className="flex items-center gap-1.5 text-xs muted">
//           <input type="checkbox" checked={follow} onChange={onToggleFollow} />
//           Auto-fit
//         </label>
//         <button
//           onClick={onToggleLocate}
//           className={clsx(
//             "ml-auto rounded-lg px-2.5 py-1.5 text-sm font-medium border transition",
//             locate
//               ? "bg-sky-600 text-white border-transparent"
//               : "border-black/10 dark:border-white/10 chip-off"
//           )}
//           title="Show my location"
//         >
//           {locate ? "📍 Locating…" : "📍 Locate me"}
//         </button>
//       </div>

//       {/* Timestamp */}
//       <div className="mt-2 text-[11px] muted">{tsText}</div>
//     </div>
//   );
// }
