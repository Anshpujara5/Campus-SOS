// src/components/location_share.tsx
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";

export type LocationShareHandle = { start: () => void; stop: () => void };

type Props = {
  sharing: boolean;
  onToggleShare: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  onError?: (msg: string) => void;
  onUpdateLastLoc?: (loc: { lat: number; lng: number } | null) => void;
  endpoint?: string;
  userId?: string;
};

function getAuthHeader(): string | null {
  const raw = localStorage.getItem("token"); 
  if (!raw) return null;
  return raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;
}

async function postWithAxios(url: string, data: unknown, onError?: (m: string) => void) {
  const auth = getAuthHeader();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = auth;

  try {
    await axios.post(url, data, { headers });
  } catch (err: any) {
    onError?.(err?.message ?? "Failed to send location");
  }
}

const LocationShare = forwardRef<LocationShareHandle, Props>(function LocationShare(
  { sharing, onToggleShare, className = "", onError, onUpdateLastLoc, endpoint, userId }: Props,
  ref
) {
  const watchIdRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const [lastSentAt, setLastSentAt] = useState("");

  const resolvedEndpoint =
    endpoint ??
    `${(BACKEND_URL || window.location.origin).replace(/\/+$/, "")}/api/v1/location/put`;

  const send = (status: "start" | "stop" | "online" | "offline", coords?: { lat: number; lng: number }) => {
    const payload: any = {
      type: "location",
      status,
      userId,
      ts: Date.now(),
    };
    if (coords) Object.assign(payload, coords);
    void postWithAxios(resolvedEndpoint, payload, onError);
  };

  const handleOnline = (lat: number, lng: number) => {
    setLastSentAt(new Date().toLocaleTimeString());
    onUpdateLastLoc?.({ lat, lng });
    send("online", { lat, lng });
  };

  const start = () => {
    if (activeRef.current || watchIdRef.current != null) return;

    const auth = getAuthHeader();
    if (!auth) {
      onError?.("You must be signed in to share location.");
      return;
    }

    if (!("geolocation" in navigator)) {
      onError?.("Geolocation not supported.");
      return;
    }

    activeRef.current = true;

    send("start");

    navigator.geolocation.getCurrentPosition(
      (pos) => handleOnline(pos.coords.latitude, pos.coords.longitude),
      (err) => onError?.(err.message || "Geolocation error"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => handleOnline(pos.coords.latitude, pos.coords.longitude),
      (err) => onError?.(err.message || "Geolocation error"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  };

  const stop = () => {
    if (!activeRef.current) return;
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    activeRef.current = false;
    onUpdateLastLoc?.(null);
    setLastSentAt("");
    send("stop");
    send("offline");
  };

  useImperativeHandle(ref, () => ({ start, stop }), []);

  useEffect(() => {
    const handleUnload = () => {
      if (activeRef.current) {
        send("offline");
        activeRef.current = false;
      }
    };
    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
      if (activeRef.current) stop();
    };
  }, []);

  return (
    <div className={`rounded-xl border border-white/10 bg-neutral-900/50 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium opacity-90">Location Sharing</h3>
          <p className="text-xs opacity-70">
            {sharing ? "Sharing is ON" : "Sharing is OFF"}
            {lastSentAt ? ` • Last sent: ${lastSentAt}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleShare}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
            sharing
              ? "bg-rose-600/90 hover:bg-rose-600 border-rose-400/40 text-white"
              : "bg-emerald-600/90 hover:bg-emerald-600 border-emerald-400/40 text-white"
          }`}
        >
          {sharing ? "Stop" : "Start"}
        </button>
      </div>
    </div>
  );
});

export default LocationShare;


// // src/components/location_share.tsx
// import React, {
//   forwardRef,
//   useEffect,
//   useImperativeHandle,
//   useRef,
//   useState,
// } from "react";
// import axios from "axios";
// import { BACKEND_URL } from "../config";

// export type LocationShareHandle = { start: () => void; stop: () => void };

// type Props = {
//   sharing: boolean;
//   onToggleShare: React.MouseEventHandler<HTMLButtonElement>;
//   className?: string;
//   onError?: (msg: string) => void;
//   onUpdateLastLoc?: (loc: { lat: number; lng: number } | null) => void;
//   endpoint?: string;         // defaults to `${BACKEND_URL}/api/v1/put`
//   userId?: string;
// };

// async function postWithAxios(
//   url: string,
//   data: any,
// ) {
//   const auth = localStorage.getItem("token"); // e.g., "Bearer <jwt>"
//   const headers: Record<string, string> = { "Content-Type": "application/json" };
//   if (auth) headers.Authorization = auth;

//   try {
//     await axios.post(url, data, { headers, withCredentials: true });
//   } catch (err) {
//     // swallow network errors here; caller can log UI errors separately if desired
//     // console.warn("[LocationShare] POST failed", err);
//   }
// }

// const LocationShare = forwardRef<LocationShareHandle, Props>(function LocationShare(
//   {
//     sharing,
//     onToggleShare,
//     className = "",
//     onError,
//     onUpdateLastLoc,
//     endpoint,
//     userId,
//   }: Props,
//   ref
// ) {
//   const watchIdRef = useRef<number | null>(null);
//   const activeRef = useRef(false);
//   const [lastSentAt, setLastSentAt] = useState("");

//   const resolvedEndpoint =
//     endpoint || `${(BACKEND_URL || window.location.origin).replace(/\/+$/, "")}/api/v1/location/put`;

//   const send = (status: "start" | "stop" | "online" | "offline", coords?: { lat: number; lng: number }) => {
//     const payload: any = {
//       type: "location",
//       status,
//       userId,
//       ts: Date.now(),
//     };
//     if (coords) Object.assign(payload, coords);
//     postWithAxios(resolvedEndpoint, payload);
//   };

//   const handleOnline = (lat: number, lng: number) => {
//     setLastSentAt(new Date().toLocaleTimeString());
//     onUpdateLastLoc?.({ lat, lng });
//     send("online", { lat, lng });
//   };

//   const start = () => {
//     if (activeRef.current || watchIdRef.current != null) return;
//     if (!("geolocation" in navigator)) {
//       onError?.("Geolocation not supported.");
//       return;
//     }
//     activeRef.current = true;

//     // immediate POST so you see traffic on Start
//     send("start");

//     // one-shot fix
//     navigator.geolocation.getCurrentPosition(
//       (pos) => handleOnline(pos.coords.latitude, pos.coords.longitude),
//       (err) => onError?.(err.message || "Geolocation error"),
//       { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
//     );

//     // continuous updates
//     watchIdRef.current = navigator.geolocation.watchPosition(
//       (pos) => handleOnline(pos.coords.latitude, pos.coords.longitude),
//       (err) => onError?.(err.message || "Geolocation error"),
//       { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
//     );
//   };

//   const stop = () => {
//     if (!activeRef.current) return;
//     if (watchIdRef.current != null) {
//       navigator.geolocation.clearWatch(watchIdRef.current);
//       watchIdRef.current = null;
//     }
//     activeRef.current = false;
//     onUpdateLastLoc?.(null);
//     setLastSentAt("");
//     send("stop");
//     send("offline");
//   };

//   useImperativeHandle(ref, () => ({ start, stop }), []);

//   useEffect(() => {
//     const handleUnload = () => {
//       if (activeRef.current) {
//         send("offline");
//         activeRef.current = false;
//       }
//     };
//     window.addEventListener("pagehide", handleUnload);
//     window.addEventListener("beforeunload", handleUnload);
//     return () => {
//       window.removeEventListener("pagehide", handleUnload);
//       window.removeEventListener("beforeunload", handleUnload);
//       if (activeRef.current) stop();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <div className={`rounded-xl border border-white/10 bg-neutral-900/50 p-4 ${className}`}>
//       <div className="flex items-center justify-between gap-3">
//         <div>
//           <h3 className="text-sm font-medium opacity-90">Location Sharing</h3>
//           <p className="text-xs opacity-70">
//             {sharing ? "Sharing is ON" : "Sharing is OFF"}
//             {lastSentAt ? ` • Last sent: ${lastSentAt}` : ""}
//           </p>
//         </div>
//         <button
//           type="button"
//           onClick={onToggleShare}
//           className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
//             sharing
//               ? "bg-rose-600/90 hover:bg-rose-600 border-rose-400/40 text-white"
//               : "bg-emerald-600/90 hover:bg-emerald-600 border-emerald-400/40 text-white"
//           }`}
//         >
//           {sharing ? "Stop" : "Start"}
//         </button>
//       </div>
//     </div>
//   );
// });

// export default LocationShare;
