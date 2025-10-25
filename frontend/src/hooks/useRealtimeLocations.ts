// src/hooks/useRealtimeLocations.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchEventSource, type EventSourceMessage } from "@microsoft/fetch-event-source";
import { BACKEND_URL } from "../config";

export type Loc = {
  userId: string;
  name?: string;
  role: string;
  lat: number;
  lng: number;
  ts: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
};

export default function useRealtimeLocations(roleFilter?: string) {
  const [rowsMap, setRowsMap] = useState<Map<string, Loc>>(new Map());

  // Guards that persist across renders
  const connectingRef = useRef(false);
  const startedRef    = useRef(false);          // NEW: blocks re-starts even before onopen
  const abortRef      = useRef<AbortController | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("token") ?? "";
    if (!raw) return;
    const authHeader = raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;

    if (startedRef.current) return;             // <-- prevents duplicate opens
    startedRef.current = true;
    connectingRef.current = true;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchEventSource(`${BACKEND_URL}/api/v1/location/stream`, {
      method: "GET",
      signal: ctrl.signal,
      headers: { Authorization: authHeader },
      openWhenHidden: true,

      async onopen(res) {
        if (!res.ok) throw new Error(`SSE open failed: ${res.status}`);
        connectingRef.current = false;
      },

      onmessage(ev: EventSourceMessage) {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg?.type === "snapshot" && Array.isArray(msg.data)) {
            const m = new Map<string, Loc>();
            (msg.data as Loc[]).forEach((loc) => m.set(loc.userId, loc));
            setRowsMap(m);
          } else if (msg?.type === "location" && msg.data) {
            const loc = msg.data as Loc;
            setRowsMap((prev) => {
              const next = new Map(prev);
              next.set(loc.userId, loc);
              return next;
            });
          }
        } catch {}
      },

      // IMPORTANT: let the library handle reconnects; do NOT schedule your own
      onerror(err) {
        // Throw to close this session; fetchEventSource will handle backoff/retry safely
        throw err;
      },

      // REMOVE custom onclose retries to avoid double-reconnects
    });

    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      connectingRef.current = false;
      startedRef.current = false;
    };
  }, []); // open ONCE; filter is applied client-side below

  const rows = useMemo(() => {
    const arr = Array.from(rowsMap.values());
    if (!roleFilter) return arr;
    const rf = roleFilter.toLowerCase();
    return arr.filter((l) => String(l.role).toLowerCase() === rf);
  }, [rowsMap, roleFilter]);

  return rows;
}
