"use client";
import React from "react";
import { Wifi, WifiOff, Radio, ShieldAlert } from "lucide-react";
import { useConnectivity } from "@/lib/net";

export type NetBadgeProps = {
  className?: string;
};

export function NetBadge({ className = "" }: NetBadgeProps) {
  const { status, cloudUrl, edgeUrl, reason } = useConnectivity();

  if (status === "online") {
    return (
      <span
        title={`Cloud: ${cloudUrl}`}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 ${className}`}
      >
        <Wifi size={14} /> Online
      </span>
    );
  }

  if (status === "edge") {
    return (
      <span
        title={`Edge: ${edgeUrl}`}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-sky-100 text-sky-700 border border-sky-200 ${className}`}
      >
        <Radio size={14} /> Edge (Local)
      </span>
    );
  }

  if (status === "blocked") {
    return (
      <span
        title={reason || "Mixed content is blocked on HTTPS pages. Provide an HTTPS EDGE URL or run the frontend locally."}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 ${className}`}
      >
        <ShieldAlert size={14} /> Edge Blocked
      </span>
    );
  }

  return (
    <span
      title="No connectivity. Messages will be queued."
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 ${className}`}
    >
      <WifiOff size={14} /> Offline (Queued)
    </span>
  );
}

// both default and named export to satisfy any import styles
export default NetBadge;
