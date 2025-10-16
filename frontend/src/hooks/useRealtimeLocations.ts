// src/hooks/useRealtimeLocations.ts
import { useEffect, useState } from "react";
import { BACKEND_URL } from "../config";

export type Loc = {
  name?: string; 
  userId: string; role: string; lat: number; lng: number; ts: number;
  speed?: number | null; heading?: number | null; accuracy?: number | null;
};

export default function useRealtimeLocations(roleFilter?: string) {
  const [rows, setRows] = useState<Map<string, Loc>>(new Map());

  useEffect(() => {
    const m = new Map<string, Loc>();
    const url = `${BACKEND_URL}/api/v1/location/stream`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "snapshot") {
          (msg.data as Loc[]).forEach((loc) => {
            if (!roleFilter || loc.role.toLowerCase() === roleFilter.toLowerCase()) m.set(loc.userId, loc);
          });
          setRows(new Map(m));
        } else if (msg.type === "location") {
          const loc = msg.data as Loc;
          if (!roleFilter || loc.role.toLowerCase() === roleFilter.toLowerCase()) {
            m.set(loc.userId, loc);
            setRows(new Map(m));
          }
        }
      } catch {}
    };

    return () => es.close();
  }, [roleFilter]);

  return Array.from(rows.values());
}


// import { useEffect, useState } from "react";

// export type Loc = {
//   userId: string;
//   role: string;
//   lat: number;
//   lng: number;
//   ts: number;
//   speed?: number | null;
//   heading?: number | null;
//   accuracy?: number | null;
// };

// const SSE_URL = "http://localhost:8787/api/v1/location/stream";

// export default function useRealtimeLocations(roleFilter?: string) {
//   const [rows, setRows] = useState<Map<string, Loc>>(new Map());

//   useEffect(() => {
//     const m = new Map<string, Loc>();
//     const es = new EventSource(SSE_URL);

//     es.onmessage = (e) => {
//       try {
//         const msg = JSON.parse(e.data);
//         if (msg.type === "snapshot") {
//           (msg.data as Loc[]).forEach((loc) => {
//             if (!roleFilter || loc.role.toLowerCase() === roleFilter.toLowerCase()) {
//               m.set(loc.userId, loc);
//             }
//           });
//           setRows(new Map(m));
//         } else if (msg.type === "location") {
//           const loc = msg.data as Loc;
//           if (!roleFilter || loc.role.toLowerCase() === roleFilter.toLowerCase()) {
//             m.set(loc.userId, loc);
//             setRows(new Map(m));
//           }
//         }
//       } catch {}
//     };

//     return () => es.close();
//   }, [roleFilter]);

//   return Array.from(rows.values());
// }
