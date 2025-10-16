// src/pages/common_pages/CampusMap.tsx
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  Pane,
  Tooltip,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import useRealtimeLocations, { type Loc } from "../../hooks/useRealtimeLocations";
import { pointInPolygon, snapToPolygonBoundary, type LatLng } from "../../lib/campusGeom";

const { BaseLayer, Overlay } = LayersControl;

/* ---------- Campus polygon ---------- */
const CAMPUS_POLYGON: [number, number][][] = [[
  [31.701142435233336, 76.52183491166852],
  [31.700896058360115, 76.5228150353501],
  [31.701066627033995, 76.52361695472655],
  [31.70133195545968, 76.52404018995327],
  [31.701313003454203, 76.52515396686454],
  [31.702336406195244, 76.52600043731803],
  [31.703321894460032, 76.52722559191955],
  [31.705027522483192, 76.52780475591368],
  [31.70517913234525, 76.52856212421466],
  [31.706012982155613, 76.52865122636723],
  [31.7073963982604, 76.52960907451103],
  [31.713612040610613, 76.5271587653047],
  [31.713934181448877, 76.52602271285576],
  [31.713972080298035, 76.52515396686454],
  [31.7127593094594, 76.52493121148228],
  [31.711982369804915, 76.5243965985652],
  [31.711527572839856, 76.524062465491],
  [31.711546522758226, 76.52359467918876],
  [31.710978023531126, 76.52314916842431],
  [31.71027686968536, 76.5228150353501],
  [31.709822064355592, 76.52272593319753],
  [31.709348306432304, 76.52225814689359],
  [31.709083000937625, 76.52210221812624],
  [31.708173376337953, 76.52257000443012],
  [31.706429904250257, 76.5235055770346],
  [31.703947295043434, 76.52270365765816],
  [31.702014225068837, 76.52283731088784],
  [31.701350907460608, 76.52199084043599],
  [31.701142435233336, 76.52183491166852],
]];
const campusBounds = L.latLngBounds(CAMPUS_POLYGON[0].map(([lat, lng]) => L.latLng(lat, lng)));
const WORLD_RING: [number, number][] = [[85, -180], [85, 180], [-85, 180], [-85, -180]];
const POLY: LatLng[] = CAMPUS_POLYGON[0];

/* ---------- Style injector (hover grow + polish) ---------- */
function StyleInjector() {
  useEffect(() => {
    const id = "map-fancy-styles";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 3px rgba(37,99,235,0.0); transform: scale(1); }
        50% { box-shadow: 0 0 0 14px rgba(37,99,235,0.25); transform: scale(1.06); }
        100% { box-shadow: 0 0 0 3px rgba(37,99,235,0.0); transform: scale(1); }
      }
      .pin-root {
        display:inline-flex; align-items:center; justify-content:center;
        transform-origin:center center;
        transition: transform 150ms ease;
        will-change: transform;
      }
      .pin-root:hover { transform: scale(1.35); } /* bigger on hover */

      .pin-wrap { display:flex; align-items:center; justify-content:center; position:relative; }
      .pin-body { border-radius:50%; border:3px solid #fff; filter: drop-shadow(0 6px 10px rgba(0,0,0,.25)); background:#fff; }
      .pin-img  { display:block; width:100%; height:100%; object-fit:contain; }
      .pin-dir  { width:0; height:0; border-left:10px solid transparent; border-right:10px solid transparent; border-top:14px solid currentColor; position:absolute; transform: translateY(-34px); opacity:.9; }
      .name-chip { background: rgba(255,255,255,.96); border:1px solid rgba(0,0,0,.08); padding:4px 8px; border-radius:999px; box-shadow: 0 4px 8px rgba(0,0,0,.08); font-weight:600; }
    `;
    document.head.appendChild(s);
  }, []);
  return null;
}

/* ---------- Role helpers (use the small pics as the actual pin) ---------- */
type RoleKey = "ambulance" | "ev" | "student";
const normalizeRole = (role: string): RoleKey | "other" => {
  const r = role.toLowerCase();
  if (r === "ambulance") return "ambulance";
  if (r === "ev" || r === "driver") return "ev";
  if (r === "student") return "student";
  return "other";
};

/** Use Twemoji SVGs (crisp) — replace with your own /public/icons/*.png if you prefer */
const roleAssets: Record<RoleKey, string> = {
  ambulance: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f691.svg",           // 🚑
  ev:        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f6f5.svg",            // 🛵 scooter
  student:   "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9d1-200d-1f393.svg", // 🧑‍🎓
};

/** Fallback dot color if image fails */
const roleFallback: Record<RoleKey | "other", string> = {
  ambulance: "#2563eb",
  ev: "#7c3aed",
  student: "#16a34a",
  other: "#6b7280",
};

/** Icon pixel sizes */
const roleSize: Record<RoleKey | "other", number> = {
  ambulance: 48,
  ev: 42,
  student: 38,
  other: 36,
};

/** Build an image pin (or fallback colored dot) — no extra mini badge */
function imageOrDotIcon(
  rk: RoleKey | "other",
  opts?: { heading?: number | null; ring?: string; pulse?: boolean }
) {
  const size = roleSize[rk] ?? 36;
  const src = (roleAssets as any)[rk] as string | undefined;
  const { heading, ring, pulse } = opts || {};

  if (src) {
    const dir = Number.isFinite(heading as number)
      ? `<div class="pin-dir" style="color:#333; transform: translateY(-${size * 1.0}px) rotate(${heading}deg)"></div>`
      : "";

    const ringCSS = ring ? `box-shadow:0 0 0 3px ${ring};` : "";
    const halo = pulse ? "animation:pulse 1.4s ease-in-out infinite;" : "";

    const html = `
      <div class="pin-root">
        <div class="pin-wrap" style="${halo}">
          ${dir}
          <div class="pin-body" style="width:${size}px;height:${size}px;border:0;${ringCSS}">
            <img class="pin-img" src="${src}" alt="" />
          </div>
        </div>
      </div>
    `;
    return L.divIcon({ className: "pin", html, iconAnchor: [size / 2, size / 2] });
  }

  // fallback to colored dot
  const color = roleFallback[rk] ?? "#6b7280";
  const dir = Number.isFinite(heading as number)
    ? `<div class="pin-dir" style="color:${color}; transform: translateY(-${size * 1.1}px) rotate(${heading}deg)"></div>`
    : "";
  const ringCSS = ring ? `box-shadow:0 0 0 3px ${ring};` : "";
  const html = `
    <div class="pin-root">
      <div class="pin-wrap">
        ${dir}
        <div class="pin-body" style="width:${size}px;height:${size}px;background:${color};${ringCSS}"></div>
      </div>
    </div>
  `;
  return L.divIcon({ className: "pin", html, iconAnchor: [size / 2, size / 2] });
}

function displayNameOf(d: Loc) {
  if (d.name && d.name.trim()) return d.name.trim();
  const tail = d.userId.replace(/.*[-_:]/, "").slice(-4);
  const rk = normalizeRole(d.role);
  if (rk === "ambulance") return `Ambulance ${tail}`;
  if (rk === "ev") return `EV ${tail}`;
  if (rk === "student") return `Student ${tail}`;
  return d.userId.slice(0, 8);
}

/* ---------- Component ---------- */
export default function CampusMap() {
  const [showAmb, setShowAmb] = useState(true);
  const [showEv, setShowEv] = useState(true);
  const [showStu, setShowStu] = useState(true);

  const live = useRealtimeLocations();

  const filtered = useMemo(
    () =>
      live.filter((d) => {
        const rk = normalizeRole(d.role);
        if (rk === "ambulance" && !showAmb) return false;
        if (rk === "ev" && !showEv) return false;
        if (rk === "student" && !showStu) return false;
        return true;
      }),
    [live, showAmb, showEv, showStu]
  );

  return (
    <div className="relative h-[calc(100vh-64px)] w-full rounded-2xl overflow-hidden">
      <StyleInjector />

      {/* Role filters */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
        <div className="rounded-xl bg-white/95 p-2 shadow">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={showAmb} onChange={() => setShowAmb((v) => !v)} /> 🚑 Ambulance
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={showEv} onChange={() => setShowEv((v) => !v)} /> 🛵 EV
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={showStu} onChange={() => setShowStu((v) => !v)} /> 🧑‍🎓 Student
          </label>
        </div>
      </div>

      <MapContainer
        center={campusBounds.getCenter()}
        zoom={17}
        minZoom={16}
        className="h-full w-full"
        maxBounds={campusBounds.pad(0.15)}
        maxBoundsViscosity={1}
        scrollWheelZoom
      >
        {/* Realistic basemaps */}
        <LayersControl position="topleft">
          <BaseLayer checked name="Map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" noWrap />
          </BaseLayer>
          <BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
              noWrap
            />
          </BaseLayer>
          <Overlay checked name="Labels">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
              subdomains={["a", "b", "c", "d"]}
              attribution="© OpenStreetMap contributors, © CARTO"
              opacity={0.85}
              noWrap
            />
          </Overlay>
        </LayersControl>

        {/* Mask outside campus */}
        <Polygon positions={[WORLD_RING, CAMPUS_POLYGON[0]]} pathOptions={{ color: "#fff", fillColor: "#fff", fillOpacity: 1, opacity: 0 }} interactive={false} />
        {/* Campus outline */}
        <Polygon positions={CAMPUS_POLYGON[0]} pathOptions={{ color: "#22c55e", weight: 2, fillOpacity: 0 }} />

        {/* Live pins */}
        <Pane name="live" style={{ zIndex: 700 }}>
          {filtered.map((d: Loc) => {
            const raw: LatLng = [d.lat, d.lng];
            const inside = pointInPolygon(raw, POLY);
            const shown = inside ? raw : snapToPolygonBoundary(raw, POLY);

            const rk = normalizeRole(d.role);
            const ring = inside ? undefined : "#ef4444";     // red ring when snapped to boundary
            const pulse = rk === "ambulance";                // gentle pulse for ambulance
            const icon = imageOrDotIcon(rk, { heading: d.heading ?? undefined, ring, pulse });

            const name = displayNameOf(d);
            const sizeForOffset = roleSize[rk] ?? 36;

            return (
              <Marker key={d.userId} position={shown} icon={icon}>
                <Tooltip direction="top" offset={[0, -sizeForOffset]} opacity={1} permanent>
                  <span className="name-chip">{name}</span>
                </Tooltip>
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{name}</div>
                    <div className="text-xs opacity-80">
                      {rk === "ambulance" ? "Ambulance" : rk === "ev" ? "EV Driver" : rk === "student" ? "Student" : d.role}
                      {" · "}{new Date(d.ts).toLocaleTimeString()}
                      {d.speed != null ? <> · ~{Math.round((d.speed ?? 0) * 3.6)} km/h</> : null}
                      {Number.isFinite(d.heading as number) ? <> · heading {Math.round(d.heading as number)}°</> : null}
                      {!inside ? <span className="text-red-600"> · shown on boundary</span> : null}
                    </div>
                    <div className="text-xs opacity-60">ID: {d.userId}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </Pane>
      </MapContainer>
    </div>
  );
}


// // src/pages/common_pages/CampusMap.tsx
// import {
//   MapContainer, TileLayer, Polygon, Marker, Popup, Pane, Tooltip, LayersControl
// } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import useRealtimeLocations, { type Loc } from "../../hooks/useRealtimeLocations";
// import { pointInPolygon, snapToPolygonBoundary, type LatLng } from "../../lib/campusGeom";
// import { useEffect, useMemo, useState } from "react";

// const { BaseLayer, Overlay } = LayersControl;

// /* -------- Campus geometry (unchanged) -------- */
// const CAMPUS_POLYGON: [number, number][][] = [[
//   [31.701142435233336, 76.52183491166852],
//   [31.700896058360115, 76.5228150353501],
//   [31.701066627033995, 76.52361695472655],
//   [31.70133195545968, 76.52404018995327],
//   [31.701313003454203, 76.52515396686454],
//   [31.702336406195244, 76.52600043731803],
//   [31.703321894460032, 76.52722559191955],
//   [31.705027522483192, 76.52780475591368],
//   [31.70517913234525, 76.52856212421466],
//   [31.706012982155613, 76.52865122636723],
//   [31.7073963982604, 76.52960907451103],
//   [31.713612040610613, 76.5271587653047],
//   [31.713934181448877, 76.52602271285576],
//   [31.713972080298035, 76.52515396686454],
//   [31.7127593094594, 76.52493121148228],
//   [31.711982369804915, 76.5243965985652],
//   [31.711527572839856, 76.524062465491],
//   [31.711546522758226, 76.52359467918876],
//   [31.710978023531126, 76.52314916842431],
//   [31.71027686968536, 76.5228150353501],
//   [31.709822064355592, 76.52272593319753],
//   [31.709348306432304, 76.52225814689359],
//   [31.709083000937625, 76.52210221812624],
//   [31.708173376337953, 76.52257000443012],
//   [31.706429904250257, 76.5235055770346],
//   [31.703947295043434, 76.52270365765816],
//   [31.702014225068837, 76.52283731088784],
//   [31.701350907460608, 76.52199084043599],
//   [31.701142435233336, 76.52183491166852],
// ]];
// const campusBounds = L.latLngBounds(CAMPUS_POLYGON[0].map(([lat, lng]) => L.latLng(lat, lng)));
// const WORLD_RING: [number, number][] = [[85, -180], [85, 180], [-85, 180], [-85, -180]];
// const POLY: LatLng[] = CAMPUS_POLYGON[0];

// /* -------- Style injector for pins (from your last version) -------- */
// function StyleInjector() {
//   useEffect(() => {
//     const id = "map-fancy-styles";
//     if (document.getElementById(id)) return;
//     const s = document.createElement("style");
//     s.id = id;
//     s.textContent = `
//       @keyframes pulse {
//         0% { box-shadow: 0 0 0 3px rgba(37,99,235,0.0); transform: scale(1); }
//         50% { box-shadow: 0 0 0 14px rgba(37,99,235,0.25); transform: scale(1.06); }
//         100% { box-shadow: 0 0 0 3px rgba(37,99,235,0.0); transform: scale(1); }
//       }
//       .pin-wrap { display:flex; align-items:center; justify-content:center; }
//       .pin-body { border-radius:50%; border:3px solid #fff; }
//       .pin-dir  { width:0; height:0; border-left:10px solid transparent; border-right:10px solid transparent; border-top:14px solid currentColor; position:absolute; transform: translateY(-34px); opacity:.9; }
//       .pin-badge { position:absolute; right:-10px; bottom:-10px; background:#fff; border-radius:999px; padding:4px 6px; font-size:12px; border:1px solid rgba(0,0,0,.08); }
//       .name-chip { background: rgba(255,255,255,.96); border:1px solid rgba(0,0,0,.08); padding:4px 8px; border-radius:999px; box-shadow: 0 4px 8px rgba(0,0,0,.08); font-weight:600; }
//     `;
//     document.head.appendChild(s);
//   }, []);
//   return null;
// }

// /* -------- Role helpers (colors/sizes) -------- */
// type RoleKey = "ambulance" | "ev" | "student";
// const normalizeRole = (role: string): RoleKey | "other" => {
//   const r = role.toLowerCase();
//   if (r === "ambulance") return "ambulance";
//   if (r === "ev" || r === "driver") return "ev";
//   if (r === "student") return "student";
//   return "other";
// };
// const roleStyle = (rk: RoleKey | "other") => {
//   switch (rk) {
//     case "ambulance": return { color: "#2563eb", size: 40, pulse: true,  badge: "🚑" };
//     case "ev":        return { color: "#7c3aed", size: 36, pulse: false, badge: "⚡" };
//     case "student":   return { color: "#16a34a", size: 32, pulse: false, badge: "🧑‍🎓" };
//     default:          return { color: "#6b7280", size: 30, pulse: false, badge: "" };
//   }
// };
// const fancyIcon = (hex: string, size: number, opts?: { heading?: number | null; pulse?: boolean; badge?: string; ring?: string }) => {
//   const { heading, pulse, badge, ring } = opts || {};
//   const dir = Number.isFinite(heading as number)
//     ? `<div class="pin-dir" style="color:${hex}; transform: translateY(-${size * 1.1}px) rotate(${heading}deg)"></div>`
//     : "";
//   const halo = pulse ? "animation:pulse 1.4s ease-in-out infinite;" : "";
//   const outerRing = ring || hex;
//   const body = `<div class="pin-body" style="width:${size}px;height:${size}px;background:${hex};box-shadow:0 0 0 3px ${outerRing};${halo}"></div>`;
//   const badgeEl = badge ? `<div class="pin-badge">${badge}</div>` : "";
//   return L.divIcon({ className: "pin", html: `<div class="pin-wrap" style="position:relative">${dir}${body}${badgeEl}</div>`, iconAnchor: [size/2, size/2] });
// };
// function displayNameOf(d: Loc) {
//   if (d.name && d.name.trim()) return d.name.trim();
//   const tail = d.userId.replace(/.*[-_:]/, "").slice(-4);
//   const rk = normalizeRole(d.role);
//   if (rk === "ambulance") return `Ambulance ${tail}`;
//   if (rk === "ev") return `EV ${tail}`;
//   if (rk === "student") return `Student ${tail}`;
//   return d.userId.slice(0, 8);
// }

// /* -------- Component -------- */
// export default function CampusMap() {
//   const [showAmb, setShowAmb] = useState(true);
//   const [showEv, setShowEv] = useState(true);
//   const [showStu, setShowStu] = useState(true);

//   const live = useRealtimeLocations();
//   const filtered = useMemo(
//     () => live.filter(d => {
//       const rk = normalizeRole(d.role);
//       if (rk === "ambulance" && !showAmb) return false;
//       if (rk === "ev" && !showEv) return false;
//       if (rk === "student" && !showStu) return false;
//       return true;
//     }),
//     [live, showAmb, showEv, showStu]
//   );

//   return (
//     <div className="relative h-[calc(100vh-64px)] w-full rounded-2xl overflow-hidden">
//       <StyleInjector />

//       {/* Layer toggle + filters (top-right) */}
//       <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
//         <div className="rounded-xl bg-white/95 p-2 shadow">
//           <label className="flex items-center gap-1 text-sm">
//             <input type="checkbox" checked={showAmb} onChange={() => setShowAmb(v => !v)} /> 🚑 Ambulance
//           </label>
//           <label className="flex items-center gap-1 text-sm">
//             <input type="checkbox" checked={showEv} onChange={() => setShowEv(v => !v)} /> ⚡ EV
//           </label>
//           <label className="flex items-center gap-1 text-sm">
//             <input type="checkbox" checked={showStu} onChange={() => setShowStu(v => !v)} /> 🧑‍🎓 Student
//           </label>
//         </div>
//       </div>

//       <MapContainer
//         center={campusBounds.getCenter()}
//         zoom={17}
//         minZoom={16}
//         className="h-full w-full"
//         maxBounds={campusBounds.pad(0.15)}
//         maxBoundsViscosity={1}
//         scrollWheelZoom
//       >
//         {/* --- New: realistic base layers --- */}
//         <LayersControl position="topleft">
//           <BaseLayer checked name="Map">
//             <TileLayer
//               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//               attribution="© OpenStreetMap contributors"
//               noWrap
//             />
//           </BaseLayer>

//           <BaseLayer name="Satellite">
//             {/* Esri World Imagery */}
//             <TileLayer
//               url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
//               attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
//               noWrap
//             />
//           </BaseLayer>

//           {/* Optional labels overlay (for satellite) */}
//           <Overlay checked name="Labels">
//             <TileLayer
//               url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
//               subdomains={["a","b","c","d"]}
//               attribution='© OpenStreetMap contributors, © CARTO'
//               opacity={0.85}
//               noWrap
//             />
//           </Overlay>
//         </LayersControl>

//         {/* White outside campus */}
//         <Polygon
//           positions={[WORLD_RING, CAMPUS_POLYGON[0]]}
//           pathOptions={{ color: "#fff", fillColor: "#fff", fillOpacity: 1, opacity: 0 }}
//           interactive={false}
//         />
//         {/* Campus outline */}
//         <Polygon positions={CAMPUS_POLYGON[0]} pathOptions={{ color: "#22c55e", weight: 2, fillOpacity: 0 }} />

//         {/* Live markers with snapping + styling */}
//         <Pane name="live" style={{ zIndex: 700 }}>
//           {filtered.map((d: Loc) => {
//             const raw: LatLng = [d.lat, d.lng];
//             const inside = pointInPolygon(raw, POLY);
//             const shown = inside ? raw : snapToPolygonBoundary(raw, POLY);

//             const rk = normalizeRole(d.role);
//             const { color, size, pulse, badge } = roleStyle(rk);
//             const ring = inside ? undefined : "#ef4444";
//             const icon = fancyIcon(color, size, { heading: d.heading ?? undefined, pulse, badge, ring });
//             const name = displayNameOf(d);

//             return (
//               <Marker key={d.userId} position={shown} icon={icon}>
//                 <Tooltip direction="top" offset={[0, -size]} opacity={1} permanent>
//                   <span className="name-chip">{name}</span>
//                 </Tooltip>
//                 <Popup>
//                   <div className="space-y-1">
//                     <div className="font-semibold">{name}</div>
//                     <div className="text-xs opacity-80">
//                       {rk === "ambulance" ? "Ambulance" : rk === "ev" ? "EV Driver" : rk === "student" ? "Student" : d.role}
//                       {" · "}{new Date(d.ts).toLocaleTimeString()}
//                       {d.speed != null ? <> · ~{Math.round((d.speed ?? 0) * 3.6)} km/h</> : null}
//                       {Number.isFinite(d.heading as number) ? <> · heading {Math.round(d.heading as number)}°</> : null}
//                       {!inside ? <span className="text-red-600"> · shown on boundary</span> : null}
//                     </div>
//                     <div className="text-xs opacity-60">ID: {d.userId}</div>
//                   </div>
//                 </Popup>
//               </Marker>
//             );
//           })}
//         </Pane>
//       </MapContainer>
//     </div>
//   );
// }