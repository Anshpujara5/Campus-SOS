import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import useRealtimeLocations, { type Loc } from "../../hooks/useRealtimeLocations";
import LocationShare, { type LocationShareHandle } from "../../components/location_share";
import MapLivePanel from "../../components/MapLivePanel";
import CampusMapCanvas from "./campusMapCanvas";
import { Appbar } from "../../components/Appbar";
import { BACKEND_URL } from "../../config";

type RoleKey = "ambulance" | "ev" | "student";
const normalizeRole = (role: string): RoleKey | "other" => {
  const r = role.toLowerCase();
  if (r === "ambulance") return "ambulance";
  if (r === "ev" || r === "driver") return "ev";
  if (r === "student") return "student";
  return "other";
};

export default function LiveCampusPage() {
  const [showAmb, setShowAmb] = useState(true);
  const [showEv, setShowEv] = useState(true);
  const [showStu, setShowStu] = useState(true);
  const [query, setQuery] = useState("");
  const [follow, setFollow] = useState(true);
  const [locate, setLocate] = useState(false);

  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<LocationShareHandle | null>(null);
  const [selfLoc, setSelfLoc] = useState<{ lat: number; lng: number } | null>(null);

  const onToggleShare = useCallback<React.MouseEventHandler<HTMLButtonElement>>(() => {
    setSharing((prev) => {
      const next = !prev;
      try { localStorage.setItem("sos:share", next ? "1" : "0"); } catch {}
      if (next) {
        shareRef.current?.start();
      } else {
        shareRef.current?.stop();
        setSelfLoc(null);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let saved = false;
    try { saved = localStorage.getItem("sos:share") === "1"; } catch {}
    if (!saved) return;
    const tryResume = () => { setSharing(true); shareRef.current?.start(); };
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" }).then((p: any) => {
        if (p.state === "granted") tryResume();
      }).catch(tryResume);
    } else {
      tryResume();
    }
  }, []);

  const live: Loc[] = useRealtimeLocations("");

  const counts = useMemo(() => {
    let amb = 0, ev = 0, stu = 0;
    for (const d of live) {
      const rk = normalizeRole(d.role);
      if (rk === "ambulance") amb++;
      else if (rk === "ev") ev++;
      else if (rk === "student") stu++;
    }
    return { amb, ev, stu, all: live.length };
  }, [live]);

  const lastUpdated = useMemo(() => {
    const ts = Math.max(0, ...live.map((d) => d.ts || 0));
    return ts ? new Date(ts < 1e12 ? ts * 1000 : ts) : null;
  }, [live]);

  return (
    <div className="w-full min-h-[100dvh] bg-background">
      <Appbar />

      <div className="px-4 md:px-6 lg:px-8 pt-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:flex-1">
            <LocationShare
              ref={shareRef}
              sharing={sharing}
              onToggleShare={onToggleShare}
              onUpdateLastLoc={setSelfLoc}
              endpoint={`${BACKEND_URL}/api/v1/location/put`} 
              userId="ansh" 
            />
          </div>

          <div className="md:flex-1">
            <MapLivePanel
              counts={counts}
              showAmb={showAmb}
              showEv={showEv}
              showStu={showStu}
              onToggleAmb={() => setShowAmb((v) => !v)}
              onToggleEv={() => setShowEv((v) => !v)}
              onToggleStu={() => setShowStu((v) => !v)}
              query={query}
              onQueryChange={setQuery}
              follow={follow}
              onToggleFollow={() => setFollow((v) => !v)}
              lastUpdated={lastUpdated}
            />
          </div>
        </div>
      </div>

      <div className="px-2 md:px-4 lg:px-6 pb-4">
        <div className="h-[calc(100dvh-240px)] md:h-[calc(100dvh-220px)] rounded-xl overflow-hidden border border-white/10">
          <CampusMapCanvas
            live={live}
            showAmb={showAmb}
            showEv={showEv}
            showStu={showStu}
            query={query}
            follow={follow}
            locate={locate}
            onLocateChange={setLocate}
            sharing={sharing}
            selfLoc={selfLoc}
          />
        </div>
      </div>
    </div>
  );
}


// // src/pages/common_pages/liveCampusPage.tsx
// import { useMemo, useState, useCallback, useRef, useEffect } from "react";
// import useRealtimeLocations, { type Loc } from "../../hooks/useRealtimeLocations";
// import LocationShare, { type LocationShareHandle } from "../../components/location_share";
// import MapLivePanel from "../../components/MapLivePanel";
// import CampusMapCanvas from "./campusMapCanvas";
// import { Appbar } from "../../components/Appbar";

// type RoleKey = "ambulance" | "ev" | "student";
// const normalizeRole = (role: string): RoleKey | "other" => {
//   const r = role.toLowerCase();
//   if (r === "ambulance") return "ambulance";
//   if (r === "ev" || r === "driver") return "ev";
//   if (r === "student") return "student";
//   return "other";
// };

// export default function LiveCampusPage() {
//   const [showAmb, setShowAmb] = useState(true);
//   const [showEv, setShowEv] = useState(true);
//   const [showStu, setShowStu] = useState(true);
//   const [query, setQuery] = useState("");
//   const [follow, setFollow] = useState(true);
//   const [locate, setLocate] = useState(false);

//   const [sharing, setSharing] = useState(false);
//   const shareRef = useRef<LocationShareHandle | null>(null);
//   const [selfLoc, setSelfLoc] = useState<{ lat: number; lng: number } | null>(null);

//   const onToggleShare = useCallback(() => {
//     setSharing((prev) => {
//       const next = !prev;
//       try { localStorage.setItem("sos:share", next ? "1" : "0"); } catch {}
//       if (next) {
//         shareRef.current?.start();
//       } else {
//         shareRef.current?.stop();
//         setSelfLoc(null);
//       }
//       return next;
//     });
//   }, []);

//   useEffect(() => {
//     let saved = false;
//     try { saved = localStorage.getItem("sos:share") === "1"; } catch {}
//     if (!saved) return;
//     const tryResume = () => {
//       setSharing(true);
//       shareRef.current?.start();
//     };
//     if (navigator.permissions?.query) {
//       navigator.permissions.query({ name: "geolocation" }).then((p: any) => {
//         if (p.state === "granted") tryResume();
//       }).catch(tryResume);
//     } else {
//       tryResume();
//     }
//   }, []);

//   const live: Loc[] = useRealtimeLocations("");

//   const counts = useMemo(() => {
//     let amb = 0, ev = 0, stu = 0;
//     for (const d of live) {
//       const rk = normalizeRole(d.role);
//       if (rk === "ambulance") amb++;
//       else if (rk === "ev") ev++;
//       else if (rk === "student") stu++;
//     }
//     return { amb, ev, stu, all: live.length };
//   }, [live]);

//   const lastUpdated = useMemo(() => {
//     const ts = Math.max(0, ...live.map((d) => d.ts || 0));
//     return ts ? new Date(ts < 1e12 ? ts * 1000 : ts) : null;
//   }, [live]);

//   return (
//     <div className="w-full min-h-[100dvh] bg-background">
//       <Appbar />

//       <div className="px-4 md:px-6 lg:px-8 pt-4">
//         <div className="flex flex-col md:flex-row gap-4">
//           <div className="md:flex-1">
//             <LocationShare
//               ref={shareRef}
//               sharing={sharing}
//               onToggleShare={onToggleShare}
//               onUpdateLastLoc={setSelfLoc}
//             />
//           </div>

//           <div className="md:flex-1">
//             <MapLivePanel
//               counts={counts}
//               showAmb={showAmb}
//               showEv={showEv}
//               showStu={showStu}
//               onToggleAmb={() => setShowAmb((v) => !v)}
//               onToggleEv={() => setShowEv((v) => !v)}
//               onToggleStu={() => setShowStu((v) => !v)}
//               query={query}
//               onQueryChange={setQuery}
//               follow={follow}
//               onToggleFollow={() => setFollow((v) => !v)}
//               lastUpdated={lastUpdated}
//             />
//           </div>
//         </div>
//       </div>

//       <div className="px-2 md:px-4 lg:px-6 pb-4">
//         <div className="h-[calc(100dvh-240px)] md:h-[calc(100dvh-220px)] rounded-xl overflow-hidden border border-white/10">
//           <CampusMapCanvas
//             live={live}
//             showAmb={showAmb}
//             showEv={showEv}
//             showStu={showStu}
//             query={query}
//             follow={follow}
//             locate={locate}
//             onLocateChange={setLocate}
//             sharing={sharing}
//             selfLoc={selfLoc}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }
