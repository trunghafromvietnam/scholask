"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const CLOUD_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const EDGE_URL  = process.env.NEXT_PUBLIC_EDGE_URL || "";          
const PING_PATH = process.env.NEXT_PUBLIC_PING_PATH || "/health";
const INTERVAL  = Number(process.env.NEXT_PUBLIC_NET_HEALTH_INTERVAL_MS || 4000);
const TIMEOUT_MS = 1800;

async function ping(url: string) {
  if (!url) return { ok: false, ms: null as number | null };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = performance.now();
  try {
    const res = await fetch(`${url}${PING_PATH}`, { method: "GET", signal: controller.signal, cache: "no-store" });
    const ok = res.ok;
    const ms = Math.round(performance.now() - start);
    return { ok, ms };
  } catch {
    return { ok: false, ms: null };
  } finally {
    clearTimeout(id);
  }
}

type NetStatus = "cloud" | "edge" | "offline";

export function useConnectivity() {
  const [navOnline, setNavOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [cloud, setCloud] = useState<{ok:boolean; ms:number|null}>({ok:false, ms:null});
  const [edge,  setEdge]  = useState<{ok:boolean; ms:number|null}>({ok:false,  ms:null});
  const [lastChange, setLastChange] = useState<number>(Date.now());

  // queue cho chat khi offline
  const queueKeyRef = useRef<string>(""); // set sau khi biết school (tùy component)
  const setQueueKey = (key: string) => { queueKeyRef.current = key; };

  // ping định kỳ
  useEffect(() => {
    let mounted = true;

    const tick = async () => {
      setNavOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
      const [c, e] = await Promise.all([ ping(CLOUD_URL), ping(EDGE_URL) ]);
      if (!mounted) return;
      setCloud(prev => { if (prev.ok !== c.ok) setLastChange(Date.now()); return c; });
      setEdge(prev  => { if (prev.ok !== e.ok) setLastChange(Date.now()); return e; });
    };

    tick(); // run ngay
    const id = setInterval(tick, INTERVAL);

    const handle = () => { setNavOnline(navigator.onLine); setLastChange(Date.now()); };
    window.addEventListener("online", handle);
    window.addEventListener("offline", handle);

    return () => {
      mounted = false;
      clearInterval(id);
      window.removeEventListener("online", handle);
      window.removeEventListener("offline", handle);
    };
  }, []);

  // chọn mode & baseUrl
  const status: NetStatus = useMemo(() => {
    if (!navOnline) return "offline";
    if (cloud.ok)   return "cloud";
    if (edge.ok)    return "edge";
    return "offline";
  }, [navOnline, cloud.ok, edge.ok]);

  const baseUrl = status === "cloud" ? CLOUD_URL : status === "edge" ? EDGE_URL : "";
  const canSend = status !== "offline" && !!baseUrl;

  // API: thêm/đọc/flush queue (để Chat dùng)
  const enqueue = (school: string, msg: any) => {
    const key = queueKeyRef.current || `chat-queue-${school}`;
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    arr.push({ id: Date.now(), msg });
    localStorage.setItem(key, JSON.stringify(arr));
  };
  const readQueue = (school: string) => {
    const key = queueKeyRef.current || `chat-queue-${school}`;
    return JSON.parse(localStorage.getItem(key) || "[]") as {id:number; msg:any}[];
  };
  const clearQueue = (school: string) => {
    const key = queueKeyRef.current || `chat-queue-${school}`;
    localStorage.removeItem(key);
  };

  return {
    status,            // 'cloud' | 'edge' | 'offline'
    baseUrl,           // endpoint hiện tại
    canSend,           // có thể gọi API ngay không
    cloudMs: cloud.ms,
    edgeMs:  edge.ms,
    lastChange,
    // queue helpers
    setQueueKey,
    enqueue, readQueue, clearQueue,
  };
}
