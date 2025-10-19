"use client";

import React from "react";
import { Cloud, Server, WifiOff, Loader2 } from "lucide-react";
import { useConnectivity } from "@/lib/net";

function NetBadgeInner() {
  const { status } = useConnectivity(); // "cloud" | "edge" | "offline" | "connecting"

  const view =
    {
      cloud: {
        label: "Online",
        sub: "Cloud",
        icon: <Cloud size={14} />,
        ring: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      },
      edge: {
        label: "Online",
        sub: "Edge",
        icon: <Server size={14} />,
        ring: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      },
      offline: {
        label: "Offline",
        sub: "Queued",
        icon: <WifiOff size={14} />,
        ring: "bg-slate-100 text-slate-600 border-slate-200",
        dot: "bg-slate-400",
      },
      connecting: {
        label: "Connecting…",
        sub: "",
        icon: <Loader2 size={14} className="animate-spin" />,
        ring: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-400",
      },
    }[status ?? "connecting"];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${view.ring}`}
      title={
        status === "cloud"
          ? "Connected to Cloud"
          : status === "edge"
          ? "Connected to Edge Gateway"
          : status === "offline"
          ? "Offline: requests will be queued"
          : "Checking connectivity…"
      }
    >
      <span className={`w-1.5 h-1.5 rounded-full ${view.dot}`} />
      {view.icon}
      <span className="font-medium">{view.label}</span>
      {view.sub && <span className="opacity-75">({view.sub})</span>}
    </span>
  );
}

export default function NetBadge() {
  return <NetBadgeInner />;
}

// Also provide a named export so either import style works:
export { NetBadge as NetBadge };
