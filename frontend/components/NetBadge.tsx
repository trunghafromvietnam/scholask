"use client"
import { useConnectivity } from "@/lib/net"

export default function NetBadge({ className = ""}: { className?: string}) {
    const { status, cloudMs, edgeMs } = useConnectivity();

    const cfg =  {
        cloud:   { text: "Online · Cloud",  dot: "bg-emerald-500", textCls:"text-emerald-700" },
        edge:    { text: "Online · Edge",   dot: "bg-purple-500",  textCls:"text-purple-700"  },
        offline: { text: "Offline (Queue)", dot: "bg-slate-400",   textCls:"text-slate-600"   },
      }[status];

      const latency = status === "cloud" ? cloudMs : status === "edge" ? edgeMs : null;

      return (
        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-200 bg-white ${className}`}>
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          <span className={`text-xs font-medium ${cfg.textCls}`}>{cfg.text}</span>
          {typeof latency === "number" && <span className="text-[10px] text-slate-400">{latency}ms</span>}
        </div>
      );
    }