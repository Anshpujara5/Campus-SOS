// src/components/CampusMapCanvas.tsx
import {
  MapContainer, TileLayer, Polygon, Marker, Popup, Pane, Tooltip, LayersControl, Circle, useMap, ZoomControl,
} from "react-leaflet";
  import L, { type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { pointInPolygon, snapToPolygonBoundary, type LatLng } from "../../lib/campusGeom";
import type { Loc } from "../../hooks/useRealtimeLocations";

const { BaseLayer, Overlay } = LayersControl;

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
const POLY: LatLng[] = CAMPUS_POLYGON[0];

type RoleKey = "ambulance" | "ev" | "student";
const normalizeRole = (role: string): RoleKey | "other" => {
  const r = role.toLowerCase();
  if (r === "ambulance") return "ambulance";
  if (r === "ev" || r === "driver") return "ev";
  if (r === "student") return "student";
  return "other";
};
const roleAssets: Record<RoleKey, string> = {
  ambulance: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f691.svg",
  ev: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f6f5.svg",
  student: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9d1-200d-1f393.svg",
};
const roleFallback: Record<RoleKey | "other", string> = {
  ambulance: "#2563eb", ev: "#7c3aed", student: "#16a34a", other: "#6b7280",
};
const roleSize: Record<RoleKey | "other", number> = { ambulance: 48, ev: 42, student: 38, other: 36 };

function imageOrDotIcon(
  rk: RoleKey | "other",
  opts?: { heading?: number | null; ring?: string; pulse?: boolean }
) {
  const size = roleSize[rk] ?? 36;
  const src = (roleAssets as any)[rk] as string | undefined;
  const { heading, ring, pulse } = opts || {};
  if (src) {
    const dir = Number.isFinite(heading as number)
      ? `<div class="pin-dir" style="color:#333; transform: translateY(-${size}px) rotate(${heading}deg)"></div>` : "";
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
      </div>`;
    return L.divIcon({ className: "pin", html, iconAnchor: [size/2, size/2] });
  }
  const color = roleFallback[rk] ?? "#6b7280";
  const dir = Number.isFinite(heading as number)
    ? `<div class="pin-dir" style="color:${color}; transform: translateY(-${size*1.1}px) rotate(${heading}deg)"></div>` : "";
  const ringCSS = ring ? `box-shadow:0 0 0 3px ${ring};` : "";
  const html = `
    <div class="pin-root">
      <div class="pin-wrap">
        ${dir}
        <div class="pin-body" style="width:${size}px;height:${size}px;background:${color};${ringCSS}"></div>
      </div>
    </div>`;
  return L.divIcon({ className: "pin", html, iconAnchor: [size/2, size/2] });
}

function PinStyles() {
  useEffect(() => {
    const id = "map-pin-styles";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes pulse { 0%{box-shadow:0 0 0 3px rgba(37,99,235,0);transform:scale(1)}
        50%{box-shadow:0 0 0 14px rgba(37,99,235,.25);transform:scale(1.06)}
        100%{box-shadow:0 0 0 3px rgba(37,99,235,0);transform:scale(1)} }
      .pin-root{display:inline-flex;align-items:center;justify-content:center;transition:transform .15s}
      .pin-root:hover{transform:scale(1.2)}
      .pin-wrap{display:flex;align-items:center;justify-content:center;position:relative}
      .pin-body{border-radius:50%;border:3px solid #fff;filter:drop-shadow(0 6px 10px rgba(0,0,0,.25));background:#fff}
      .pin-img{display:block;width:100%;height:100%;object-fit:contain}
      .pin-dir{width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:14px solid currentColor;position:absolute;transform:translateY(-34px);opacity:.9}
      .name-chip{background:rgba(255,255,255,.96);border:1px solid rgba(0,0,0,.08);padding:4px 8px;border-radius:999px;box-shadow:0 4px 8px rgba(0,0,0,.08);font-weight:600}
      .dark .name-chip{background:rgba(31,41,55,.92);border-color:rgba(255,255,255,.12);color:#f3f4f6}
    `;
    document.head.appendChild(s);
  }, []);
  return null;
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

function FitTo({ points, fallback }: { points: LatLng[]; fallback: L.LatLngBoundsExpression }) {
  const map = useMap();
  const firstRun = useRef(true);
  useEffect(() => {
    const bounds = points.length
      ? L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)))
      : L.latLngBounds(fallback as any);
    const opts: L.FitBoundsOptions = { padding: [30, 30] as any, animate: !firstRun.current };
    map.fitBounds(bounds.pad(0.06), opts);
    firstRun.current = false;
  }, [points, fallback, map]);
  return null;
}

function toMs(ts?: number | null) {
  if (ts == null) return undefined;
  const n = Number(ts);
  return n < 1e12 ? n * 1000 : n;
}

export type CanvasProps = {
  live: Loc[];
  showAmb: boolean;
  showEv: boolean;
  showStu: boolean;
  query: string;
  follow: boolean;
  locate: boolean;
  onLocateChange?: (next: boolean) => void;
  sharing?: boolean;
  selfLoc?: { lat: number; lng: number } | null;
  maxAgeMs?: number;
};

export default function CampusMapCanvas({
  live, showAmb, showEv, showStu, query, follow, locate,
  sharing, selfLoc, maxAgeMs = 30_000,
}: CanvasProps) {
  const now = Date.now();

  const filtered = useMemo(
    () =>
      live.filter((d) => {
        const ms = toMs(d.ts);
        if (ms && now - ms > maxAgeMs) return false;
        const rk = normalizeRole(d.role);
        if (rk === "ambulance" && !showAmb) return false;
        if (rk === "ev" && !showEv) return false;
        if (rk === "student" && !showStu) return false;
        if (query.trim()) {
          const name = displayNameOf(d).toLowerCase();
          const id = d.userId.toLowerCase();
          const q = query.toLowerCase();
          if (!name.includes(q) && !id.includes(q)) return false;
        }
        return true;
      }),
    [live, showAmb, showEv, showStu, query, now, maxAgeMs]
  );

  const filteredPoints = useMemo<LatLng[]>(
    () => {
      const pts = filtered.map((d) => {
        const raw: LatLng = [d.lat, d.lng];
        const inside = pointInPolygon(raw, POLY);
        return inside ? raw : snapToPolygonBoundary(raw, POLY);
      });
      if (selfLoc && sharing) pts.push([selfLoc.lat, selfLoc.lng]);
      return pts;
    },
    [filtered, selfLoc, sharing]
  );

  const myRef = useRef<{ lat: number; lng: number; acc: number } | null>(null);
  useEffect(() => {
    if (!locate || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => { myRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? 20 }; },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [locate]);

  const my = myRef.current;

  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-2xl overflow-hidden">
      <PinStyles />
      <MapContainer
        center={campusBounds.getCenter()}
        zoom={17}
        minZoom={16}
        style={{ height: "100%", width: "100%" }}
        maxBounds={campusBounds.pad(0.15)}
        maxBoundsViscosity={1}
        scrollWheelZoom
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />

        {follow && <FitTo points={filteredPoints} fallback={campusBounds} />}

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

        <Polygon
          positions={[[[85,-180],[85,180],[-85,180],[-85,-180]] as LatLngTuple[], CAMPUS_POLYGON[0] as unknown as LatLngTuple[]]}
          pathOptions={{ color: "#fff", fillColor: "#fff", fillOpacity: 1, opacity: 0 }}
          interactive={false}
        />
        <Pane name="campus" style={{ zIndex: 350 }}>
          <Polygon positions={CAMPUS_POLYGON[0] as unknown as LatLngTuple[]} pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.15, fillOpacity: 0 }} interactive={false} />
          <Polygon positions={CAMPUS_POLYGON[0] as unknown as LatLngTuple[]} pathOptions={{ color: "#22c55e", weight: 2, fillOpacity: 0 }} interactive={false} />
        </Pane>

        {locate && my && (
          <Pane name="me" style={{ zIndex: 800 }}>
            <Marker
              position={[my.lat, my.lng]}
              icon={L.divIcon({
                className: "",
                html: `<div style="width:12px;height:12px;border-radius:999px;background:#0ea5e9;border:2px solid white;box-shadow:0 0 0 6px rgba(14,165,233,.25)"></div>`,
                iconAnchor: [6, 6],
              })}
            />
            <Circle
              center={[my.lat, my.lng]}
              radius={Math.min(Math.max(my.acc, 10), 80)}
              pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.08, weight: 1 }}
            />
          </Pane>
        )}

        {sharing && selfLoc && (
          <Pane name="self-echo" style={{ zIndex: 750 }}>
            <Marker
              position={[selfLoc.lat, selfLoc.lng]}
              icon={L.divIcon({
                className: "",
                html: `<div style="width:14px;height:14px;border-radius:999px;background:#22c55e;border:2px solid white;box-shadow:0 0 0 8px rgba(34,197,94,.22)"></div>`,
                iconAnchor: [7, 7],
              })}
            />
          </Pane>
        )}

        <Pane name="live" style={{ zIndex: 700 }}>
          {filtered.map((d) => {
            const raw: LatLng = [d.lat, d.lng];
            const inside = pointInPolygon(raw, POLY);
            const shown = inside ? raw : snapToPolygonBoundary(raw, POLY);
            const rk = normalizeRole(d.role);
            const ring = inside ? undefined : "#ef4444";
            const icon = imageOrDotIcon(rk, { heading: d.heading ?? undefined, ring, pulse: rk === "ambulance" });
            const name = displayNameOf(d);
            const sizeForOffset = roleSize[rk] ?? 36;
            const kmh = d.speed != null ? Math.round((d.speed ?? 0) * 3.6) : null;

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
                      {" · "}{d.ts ? new Date(toMs(d.ts)!).toLocaleTimeString() : "—"}
                      {kmh != null ? <> · ~{kmh} km/h</> : null}
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


// // src/components/CampusMapCanvas.tsx
// import {
//   MapContainer, TileLayer, Polygon, Marker, Popup, Pane, Tooltip, LayersControl, Circle, useMap, ZoomControl,
// } from "react-leaflet";
// import L, { type LatLngTuple } from "leaflet";
// import "leaflet/dist/leaflet.css";
// import { useEffect, useMemo, useRef } from "react";
// import { pointInPolygon, snapToPolygonBoundary, type LatLng } from "../../lib/campusGeom";
// import type { Loc } from "../../hooks/useRealtimeLocations";

// const { BaseLayer, Overlay } = LayersControl;

// /** === Campus polygon (+ derived bounds) === */
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
// const POLY: LatLng[] = CAMPUS_POLYGON[0];

// type RoleKey = "ambulance" | "ev" | "student";
// const normalizeRole = (role: string): RoleKey | "other" => {
//   const r = role.toLowerCase();
//   if (r === "ambulance") return "ambulance";
//   if (r === "ev" || r === "driver") return "ev";
//   if (r === "student") return "student";
//   return "other";
// };
// const roleAssets: Record<RoleKey, string> = {
//   ambulance: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f691.svg",
//   ev: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f6f5.svg",
//   student: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9d1-200d-1f393.svg",
// };
// const roleFallback: Record<RoleKey | "other", string> = {
//   ambulance: "#2563eb", ev: "#7c3aed", student: "#16a34a", other: "#6b7280",
// };
// const roleSize: Record<RoleKey | "other", number> = { ambulance: 48, ev: 42, student: 38, other: 36 };

// function imageOrDotIcon(
//   rk: RoleKey | "other",
//   opts?: { heading?: number | null; ring?: string; pulse?: boolean }
// ) {
//   const size = roleSize[rk] ?? 36;
//   const src = (roleAssets as any)[rk] as string | undefined;
//   const { heading, ring, pulse } = opts || {};
//   if (src) {
//     const dir = Number.isFinite(heading as number)
//       ? `<div class="pin-dir" style="color:#333; transform: translateY(-${size}px) rotate(${heading}deg)"></div>` : "";
//     const ringCSS = ring ? `box-shadow:0 0 0 3px ${ring};` : "";
//     const halo = pulse ? "animation:pulse 1.4s ease-in-out infinite;" : "";
//     const html = `
//       <div class="pin-root">
//         <div class="pin-wrap" style="${halo}">
//           ${dir}
//           <div class="pin-body" style="width:${size}px;height:${size}px;border:0;${ringCSS}">
//             <img class="pin-img" src="${src}" alt="" />
//           </div>
//         </div>
//       </div>`;
//     return L.divIcon({ className: "pin", html, iconAnchor: [size/2, size/2] });
//   }
//   const color = roleFallback[rk] ?? "#6b7280";
//   const dir = Number.isFinite(heading as number)
//     ? `<div class="pin-dir" style="color:${color}; transform: translateY(-${size*1.1}px) rotate(${heading}deg)"></div>` : "";
//   const ringCSS = ring ? `box-shadow:0 0 0 3px ${ring};` : "";
//   const html = `
//     <div class="pin-root">
//       <div class="pin-wrap">
//         ${dir}
//         <div class="pin-body" style="width:${size}px;height:${size}px;background:${color};${ringCSS}"></div>
//       </div>
//     </div>`;
//   return L.divIcon({ className: "pin", html, iconAnchor: [size/2, size/2] });
// }

// function PinStyles() {
//   useEffect(() => {
//     const id = "map-pin-styles";
//     if (document.getElementById(id)) return;
//     const s = document.createElement("style");
//     s.id = id;
//     s.textContent = `
//       @keyframes pulse { 0%{box-shadow:0 0 0 3px rgba(37,99,235,0);transform:scale(1)}
//         50%{box-shadow:0 0 0 14px rgba(37,99,235,.25);transform:scale(1.06)}
//         100%{box-shadow:0 0 0 3px rgba(37,99,235,0);transform:scale(1)} }
//       .pin-root{display:inline-flex;align-items:center;justify-content:center;transition:transform .15s}
//       .pin-root:hover{transform:scale(1.2)}
//       .pin-wrap{display:flex;align-items:center;justify-content:center;position:relative}
//       .pin-body{border-radius:50%;border:3px solid #fff;filter:drop-shadow(0 6px 10px rgba(0,0,0,.25));background:#fff}
//       .pin-img{display:block;width:100%;height:100%;object-fit:contain}
//       .pin-dir{width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:14px solid currentColor;position:absolute;transform:translateY(-34px);opacity:.9}
//       .name-chip{background:rgba(255,255,255,.96);border:1px solid rgba(0,0,0,.08);padding:4px 8px;border-radius:999px;box-shadow:0 4px 8px rgba(0,0,0,.08);font-weight:600}
//       .dark .name-chip{background:rgba(31,41,55,.92);border-color:rgba(255,255,255,.12);color:#f3f4f6}
//     `;
//     document.head.appendChild(s);
//   }, []);
//   return null;
// }

// function displayNameOf(d: Loc) {
//   if (d.name && d.name.trim()) return d.name.trim();
//   const tail = d.userId.replace(/.*[-_:]/, "").slice(-4);
//   const rk = normalizeRole(d.role);
//   if (rk === "ambulance") return `Ambulance ${tail}`;
//   if (rk === "ev") return `EV ${tail}`;
//   if (rk === "student") return `Student ${tail}`;
//   return d.userId.slice(0, 8);
// }

// function FitTo({ points, fallback }: { points: LatLng[]; fallback: L.LatLngBoundsExpression }) {
//   const map = useMap();
//   const firstRun = useRef(true);
//   useEffect(() => {
//     const bounds = points.length
//       ? L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)))
//       : L.latLngBounds(fallback as any);
//     const opts: L.FitBoundsOptions = { padding: [30, 30] as any, animate: !firstRun.current };
//     map.fitBounds(bounds.pad(0.06), opts);
//     firstRun.current = false;
//   }, [points, fallback, map]);
//   return null;
// }

// /** Props controlled by the parent panel */
// export type CanvasProps = {
//   live: Loc[];
//   showAmb: boolean;
//   showEv: boolean;
//   showStu: boolean;
//   query: string;
//   follow: boolean;
//   locate: boolean;
//   onLocateChange?: (next: boolean) => void;
// };

// export default function CampusMapCanvas({
//   live, showAmb, showEv, showStu, query, follow, locate, onLocateChange,
// }: CanvasProps) {
//   const filtered = useMemo(
//     () =>
//       live.filter((d) => {
//         const rk = normalizeRole(d.role);
//         if (rk === "ambulance" && !showAmb) return false;
//         if (rk === "ev" && !showEv) return false;
//         if (rk === "student" && !showStu) return false;
//         if (query.trim()) {
//           const name = displayNameOf(d).toLowerCase();
//           const id = d.userId.toLowerCase();
//           const q = query.toLowerCase();
//           if (!name.includes(q) && !id.includes(q)) return false;
//         }
//         return true;
//       }),
//     [live, showAmb, showEv, showStu, query]
//   );

//   const filteredPoints = useMemo<LatLng[]>(
//     () =>
//       filtered.map((d) => {
//         const raw: LatLng = [d.lat, d.lng];
//         const inside = pointInPolygon(raw, POLY);
//         return inside ? raw : snapToPolygonBoundary(raw, POLY);
//       }),
//     [filtered]
//   );

//   // quick “my location” watcher here (small inline—kept simple)
//   const myRef = useRef<{ lat: number; lng: number; acc: number } | null>(null);
//   useEffect(() => {
//     if (!locate || !("geolocation" in navigator)) return;
//     const id = navigator.geolocation.watchPosition(
//       (pos) => { myRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? 20 }; },
//       () => {},
//       { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
//     );
//     return () => navigator.geolocation.clearWatch(id);
//   }, [locate]);

//   const my = myRef.current;

//   return (
//     <div className="relative h-[calc(100vh-140px)] w-full rounded-2xl overflow-hidden">
//       <PinStyles />
//       <MapContainer
//         center={campusBounds.getCenter()}
//         zoom={17}
//         minZoom={16}
//         style={{ height: "100%", width: "100%" }}
//         maxBounds={campusBounds.pad(0.15)}
//         maxBoundsViscosity={1}
//         scrollWheelZoom
//         zoomControl={false}
//       >
//         <ZoomControl position="bottomright" />

//         {follow && <FitTo points={filteredPoints} fallback={campusBounds} />}

//         <LayersControl position="topleft">
//           <BaseLayer checked name="Map">
//             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" noWrap />
//           </BaseLayer>
//           <BaseLayer name="Satellite">
//             <TileLayer
//               url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
//               attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
//               noWrap
//             />
//           </BaseLayer>
//           <Overlay checked name="Labels">
//             <TileLayer
//               url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
//               subdomains={["a", "b", "c", "d"]}
//               attribution="© OpenStreetMap contributors, © CARTO"
//               opacity={0.85}
//               noWrap
//             />
//           </Overlay>
//         </LayersControl>

//         {/* Outside mask + outline (inline, or swap for your CampusBoundaryLayer) */}
//         <Polygon
//           positions={[[[85,-180],[85,180],[-85,180],[-85,-180]] as LatLngTuple[], CAMPUS_POLYGON[0] as unknown as LatLngTuple[]]}
//           pathOptions={{ color: "#fff", fillColor: "#fff", fillOpacity: 1, opacity: 0 }}
//           interactive={false}
//         />
//         <Pane name="campus" style={{ zIndex: 350 }}>
//           <Polygon positions={CAMPUS_POLYGON[0] as unknown as LatLngTuple[]} pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.15, fillOpacity: 0 }} interactive={false} />
//           <Polygon positions={CAMPUS_POLYGON[0] as unknown as LatLngTuple[]} pathOptions={{ color: "#22c55e", weight: 2, fillOpacity: 0 }} interactive={false} />
//         </Pane>

//         {/* My location */}
//         {locate && my && (
//           <Pane name="me" style={{ zIndex: 800 }}>
//             <Marker
//               position={[my.lat, my.lng]}
//               icon={L.divIcon({
//                 className: "",
//                 html: `<div style="width:12px;height:12px;border-radius:999px;background:#0ea5e9;border:2px solid white;box-shadow:0 0 0 6px rgba(14,165,233,.25)"></div>`,
//                 iconAnchor: [6, 6],
//               })}
//             />
//             <Circle
//               center={[my.lat, my.lng]}
//               radius={Math.min(Math.max(my.acc, 10), 80)}
//               pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.08, weight: 1 }}
//             />
//           </Pane>
//         )}

//         {/* Live markers */}
//         <Pane name="live" style={{ zIndex: 700 }}>
//           {filtered.map((d) => {
//             const raw: LatLng = [d.lat, d.lng];
//             const inside = pointInPolygon(raw, POLY);
//             const shown = inside ? raw : snapToPolygonBoundary(raw, POLY);
//             const rk = normalizeRole(d.role);
//             const ring = inside ? undefined : "#ef4444";
//             const icon = imageOrDotIcon(rk, { heading: d.heading ?? undefined, ring, pulse: rk === "ambulance" });
//             const name = displayNameOf(d);
//             const sizeForOffset = roleSize[rk] ?? 36;
//             const kmh = d.speed != null ? Math.round((d.speed ?? 0) * 3.6) : null;

//             return (
//               <Marker key={d.userId} position={shown} icon={icon}>
//                 <Tooltip direction="top" offset={[0, -sizeForOffset]} opacity={1} permanent>
//                   <span className="name-chip">{name}</span>
//                 </Tooltip>
//                 <Popup>
//                   <div className="space-y-1">
//                     <div className="font-semibold">{name}</div>
//                     <div className="text-xs opacity-80">
//                       {rk === "ambulance" ? "Ambulance" : rk === "ev" ? "EV Driver" : rk === "student" ? "Student" : d.role}
//                       {" · "}{d.ts ? new Date(d.ts).toLocaleTimeString() : "—"}
//                       {kmh != null ? <> · ~{kmh} km/h</> : null}
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
