"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Status = "online" | "edge" | "offline" | "blocked";

const CLOUD_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const EDGE_URL  = process.env.NEXT_PUBLIC_EDGE_URL || "";

function isHttpsPage(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
}

async function ping(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal,
    });
    if (!r.ok) return false;
    const j = await r.json().catch(() => ({}));
    return typeof j === "object" && j && j.ok === true;
  } catch {
    return false;
  }
}

export function useConnectivity() {
  const [status, setStatus] = useState<Status>("offline");
  const [baseUrl, setBaseUrl] = useState<string>(CLOUD_URL);
  const [reason, setReason] = useState<string | undefined>();
  const [queueKey, setQueueKey] = useState<string>("chat:default");

  const edgeBlocked = useMemo(
    () => isHttpsPage() && EDGE_URL.startsWith("http://") && EDGE_URL !== "",
    []
  );

  const cloudUrl = CLOUD_URL;
  const edgeUrl = EDGE_URL;

  // simple queue API (localStorage)
  function enqueue(text: string) {
    const key = `scholask:q:${queueKey}`;
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    arr.push(text);
    localStorage.setItem(key, JSON.stringify(arr));
  }
  function readQueue(): string[] {
    const key = `scholask:q:${queueKey}`;
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  function clearQueue() {
    const key = `scholask:q:${queueKey}`;
    localStorage.removeItem(key);
  }

  useEffect(() => {
    const ctrl = new AbortController();

    async function poll() {
      setReason(undefined);

      // 1) Cloud first
      const cloudOK = cloudUrl ? await ping(cloudUrl, ctrl.signal) : false;
      if (cloudOK) {
        setStatus("online");
        setBaseUrl(cloudUrl);
        return;
      }

      // 2) Edge when allowed
      if (edgeBlocked) {
        setStatus("blocked");
        setBaseUrl(cloudUrl || edgeUrl || "");
        setReason("Mixed content blocked: EDGE_URL is http:// on an https page.");
        return;
      }
      const edgeOK = edgeUrl ? await ping(edgeUrl, ctrl.signal) : false;
      if (edgeOK) {
        setStatus("edge");
        setBaseUrl(edgeUrl);
        return;
      }

      // 3) Offline
      setStatus("offline");
      setBaseUrl(cloudUrl || edgeUrl || "");
    }

    // first run + interval
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [cloudUrl, edgeUrl, edgeBlocked]);

  const canSend = status === "online" || status === "edge";

  return {
    status,
    baseUrl,
    cloudUrl,
    edgeUrl,
    canSend,
    reason,
    // queue helpers
    enqueue,
    readQueue,
    clearQueue,
    setQueueKey,
  };
}

