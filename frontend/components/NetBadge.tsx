import { useEffect, useRef, useState, useCallback } from "react";

type Status = "cloud" | "edge" | "offline";

const CLOUD_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";
const EDGE_URL  = process.env.NEXT_PUBLIC_EDGE_URL?.replace(/\/+$/, "") || ""; // dùng khi có Pi

export async function ping(url: string, msAbort = 2500): Promise<number> {
  const ctrl = new AbortController();
  const t = Date.now();
  const timer = setTimeout(() => ctrl.abort(), msAbort);
  try {
    const res = await fetch(`${url}/health?nc=${Date.now()}`, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      signal: ctrl.signal,
      headers: { "Accept": "application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Date.now() - t;
  } catch {
    clearTimeout(timer);
    throw new Error("ping failed");
  }
}

export function useConnectivity() {
  const [status, setStatus] = useState<Status>("offline");
  const [cloudMs, setCloudMs] = useState<number | null>(null);
  const [edgeMs, setEdgeMs] = useState<number | null>(null);
  const baseUrlRef = useRef<string>("");

  // simple in-memory queue
  const qRef = useRef<{ key: string; items: any[] }>({ key: "default", items: [] });

  const setQueueKey = useCallback((k: string) => {
    qRef.current.key = k;
  }, []);

  const enqueue = useCallback((item: any) => {
    qRef.current.items.push(item);
  }, []);

  const readQueue = useCallback(() => [...qRef.current.items], []);
  const clearQueue = useCallback(() => { qRef.current.items = []; }, []);

  // Decide status by pinging cloud first, then edge
  const check = useCallback(async () => {
    // 1) Try cloud
    if (CLOUD_URL) {
      try {
        const ms = await ping(CLOUD_URL, 2500);
        setCloudMs(ms);
        setStatus("cloud");
        baseUrlRef.current = CLOUD_URL;
        return;
      } catch {/* fallthrough */}
    }
    // 2) Try edge (Pi)
    if (EDGE_URL) {
      try {
        const ms = await ping(EDGE_URL, 1500);
        setEdgeMs(ms);
        setStatus("edge");
        baseUrlRef.current = EDGE_URL;
        return;
      } catch {/* fallthrough */}
    }
    // 3) Offline
    setStatus("offline");
    baseUrlRef.current = "";
  }, []);

  useEffect(() => {
    check(); // initial
    const onOnline = () => check();
    const onOffline = () => setStatus("offline");

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const t = setInterval(check, 5000); 
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(t);
    };
  }, [check]);

  const canSend = status === "cloud" || status === "edge";
  return {
    status, cloudMs, edgeMs, baseUrl: baseUrlRef.current, canSend,
    enqueue, readQueue, clearQueue, setQueueKey,
  };
}
