import { useEffect, useMemo, useRef, useState } from "react";
import { BACKEND_URL } from "../../config";

function ensureUserId(): string {
  const k = "share.auto.userId";
  const v = localStorage.getItem(k);
  if (v) return v;
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
  localStorage.setItem(k, id);
  return id;
}

function ensureName(role: string, userId: string): string {
  const k = "share.auto.name";
  const fromLS = localStorage.getItem(k);
  if (fromLS) return fromLS;

  // allow ?name= in URL
  const qs = new URLSearchParams(location.search);
  const fromQS = qs.get("name");
  if (fromQS) {
    localStorage.setItem(k, fromQS);
    return fromQS;
  }

  // make a friendly default
  const tail = userId.replace(/.*[-_:]/, "").slice(-4);
  const r = role.toLowerCase();
  const guess =
    r === "ambulance" ? `Ambulance ${tail}` :
    r === "ev" || r === "driver" ? `EV ${tail}` :
    r === "guard" ? `Guard ${tail}` :
    r === "faculty" ? `Faculty ${tail}` :
    `Student ${tail}`;
  localStorage.setItem(k, guess);
  return guess;
}

type Role = "student" | "ambulance" | "ev" | "driver" | "guard" | "faculty" | "other";

export default function ShareLocationAuto() {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const roleParam = (params.get("role") || "student").toLowerCase() as Role;
  const role: Role = ["student","ambulance","ev","driver","guard","faculty","other"].includes(roleParam) ? roleParam : "student";

  const userId = ensureUserId();
  const name = ensureName(role, userId);

  const [on, setOn] = useState(false);
  const [status, setStatus] = useState("not sharing");
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const throttleMs = 3000;
  const lastSentRef = useRef(0);
  const watchRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const sendUpdate = (coords: GeolocationCoordinates) => {
    const now = Date.now();
    if (now - lastSentRef.current < throttleMs) return;
    lastSentRef.current = now;

    const { latitude: lat, longitude: lng, heading, speed, accuracy } = coords;
    setAccuracy(accuracy ?? null);

    fetch(`${BACKEND_URL}/api/v1/location/${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, name, lat, lng, heading, speed, accuracy }),
    }).catch(() => {});

    setStatus(`${lat.toFixed(6)}, ${lng.toFixed(6)} @ ${new Date().toLocaleTimeString()}`);
  };

  const start = () => {
    if (!("geolocation" in navigator)) { alert("Geolocation not supported."); return; }
    setOn(true); setStatus("starting…"); lastSentRef.current = 0;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => sendUpdate(pos.coords),
      (err) => setStatus(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    ) as unknown as number;

    intervalRef.current = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition((pos) => sendUpdate(pos.coords), () => {});
    }, Math.max(8000, throttleMs)) as unknown as number;
  };

  const stop = () => {
    setOn(false); setStatus("not sharing"); setAccuracy(null);
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    if (intervalRef.current != null) clearInterval(intervalRef.current);
    watchRef.current = null; intervalRef.current = null;
  };

  useEffect(() => () => stop(), []);

  const shareMapLink = `${location.origin}/map?driver=${encodeURIComponent(userId)}`;

  return (
    <div className="mx-auto max-w-md p-4 space-y-4">
      <h1 className="text-xl font-semibold">Share My Location</h1>

      <div className="rounded-md border px-3 py-2 text-sm">
        <div><b>Name:</b> {name}</div>
        <div><b>Role:</b> {role}</div>
        <div className="opacity-70">Backend: <code>{BACKEND_URL}</code>{accuracy != null ? <> · accuracy ~{Math.round(accuracy)} m</> : null}</div>
      </div>

      <div className="flex gap-2">
        {!on ? (
          <button onClick={start} className="rounded-md bg-green-600 px-4 py-2 text-white">Start sharing</button>
        ) : (
          <button onClick={stop} className="rounded-md bg-red-600 px-4 py-2 text-white">Stop sharing</button>
        )}
        <a href={shareMapLink} target="_blank" rel="noreferrer" className="rounded-md bg-blue-600 px-4 py-2 text-white">
          Open map
        </a>
      </div>

      <div className="rounded-md border px-3 py-2 text-sm">
        <b>Status:</b> {status}
        <div className="mt-1 text-xs opacity-70">Tip: Use <code>?role=ambulance</code> or <code>?role=ev</code>. Optional: <code>?name=Ansh</code>.</div>
      </div>
    </div>
  );
}


// import { useEffect, useMemo, useRef, useState } from "react";
// import { BACKEND_URL } from "../../config";

// // Stable random id (persisted)
// function ensureUserId(): string {
//   const k = "share.auto.userId";
//   const v = localStorage.getItem(k);
//   if (v) return v;
//   // simple uuid v4
//   const id = crypto.randomUUID ? crypto.randomUUID() :
//     "xxxxxx".replace(/x/g, () => ((Math.random() * 36) | 0).toString(36));
//   localStorage.setItem(k, id);
//   return id;
// }

// type Role = "student" | "ambulance" | "guard" | "faculty" | "driver" | "other";

// export default function ShareLocationAuto() {
//   const params = useMemo(() => new URLSearchParams(location.search), []);
//   const roleParam = (params.get("role") || "").toLowerCase();
//   const role: Role =
//     (["student","ambulance","guard","faculty","driver","other"].includes(roleParam)
//       ? (roleParam as Role)
//       : "student");

//   const userId = ensureUserId();             // auto-generated & persisted
//   const [on, setOn] = useState(false);
//   const [status, setStatus] = useState("not sharing");
//   const [accuracy, setAccuracy] = useState<number | null>(null);

//   // Throttle + handles
//   const throttleMs = 3000; // send at most every 3s
//   const lastSentRef = useRef(0);
//   const watchRef = useRef<number | null>(null);
//   const intervalRef = useRef<number | null>(null);

//   // POST helper
//   const sendUpdate = (coords: GeolocationCoordinates) => {
//     const now = Date.now();
//     if (now - lastSentRef.current < throttleMs) return;
//     lastSentRef.current = now;

//     const { latitude: lat, longitude: lng, heading, speed, accuracy } = coords;
//     setAccuracy(accuracy ?? null);

//     fetch(`${BACKEND_URL}/api/v1/location/${encodeURIComponent(userId)}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ role, lat, lng, heading, speed, accuracy }),
//     }).catch(() => {});

//     setStatus(`${lat.toFixed(6)}, ${lng.toFixed(6)} @ ${new Date().toLocaleTimeString()}`);
//   };

//   const start = () => {
//     if (!("geolocation" in navigator)) {
//       alert("Geolocation not supported on this device/browser.");
//       return;
//     }
//     setOn(true);
//     setStatus("starting…");
//     lastSentRef.current = 0;

//     // Live stream
//     watchRef.current = navigator.geolocation.watchPosition(
//       (pos) => sendUpdate(pos.coords),
//       (err) => setStatus(`GPS error: ${err.message}`),
//       { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
//     ) as unknown as number;

//     // Fallback ping (some OS throttle background)
//     intervalRef.current = window.setInterval(() => {
//       navigator.geolocation.getCurrentPosition((pos) => sendUpdate(pos.coords), () => {});
//     }, Math.max(8000, throttleMs)) as unknown as number;
//   };

//   const stop = () => {
//     setOn(false);
//     setStatus("not sharing");
//     setAccuracy(null);
//     if (watchRef.current != null) {
//       navigator.geolocation.clearWatch(watchRef.current);
//       watchRef.current = null;
//     }
//     if (intervalRef.current != null) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }
//   };

//   useEffect(() => () => stop(), []); // cleanup on unmount

//   const shareMapLink = `${location.origin}/map?driver=${encodeURIComponent(userId)}`;

//   return (
//     <div className="mx-auto max-w-md p-4 space-y-4">
//       <h1 className="text-xl font-semibold">Share My Location</h1>

//       <div className="rounded-md border px-3 py-2 text-sm">
//         <div><b>User ID:</b> {userId}</div>
//         <div><b>Role:</b> {role}</div>
//         <div className="opacity-70">
//           Backend: <code>{BACKEND_URL}</code>
//           {accuracy != null ? <> · accuracy ~{Math.round(accuracy)} m</> : null}
//         </div>
//       </div>

//       <div className="flex gap-2">
//         {!on ? (
//           <button onClick={start} className="rounded-md bg-green-600 px-4 py-2 text-white">
//             Start sharing
//           </button>
//         ) : (
//           <button onClick={stop} className="rounded-md bg-red-600 px-4 py-2 text-white">
//             Stop sharing
//           </button>
//         )}
//         <a
//           className="rounded-md bg-blue-600 px-4 py-2 text-white"
//           href={shareMapLink}
//           target="_blank"
//           rel="noreferrer"
//           title="Open the map centered on your ID (if supported)"
//         >
//           Open map
//         </a>
//       </div>

//       <div className="rounded-md border px-3 py-2 text-sm">
//         <b>Status:</b> {status}
//         <div className="mt-1 text-xs opacity-70">
//           Tip: Keep this tab visible for best GPS frequency. Use <code>?role=ambulance</code> in the URL to set role.
//         </div>
//       </div>
//     </div>
//   );
// }
