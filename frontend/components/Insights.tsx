"use client";
import useSWR from "swr";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function Insights() {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const { data } = useSWR(base + "/admin/insights/summary", fetcher);

  const daily = data?.queries_per_day || [];
  const avg = data?.avg_latency_ms ?? 0;

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-700">Avg latency: <b>{avg} ms</b></div>
      <div className="bg-white rounded-xl p-3 overflow-x-auto">
        <LineChart width={600} height={250} data={daily}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" /><YAxis /><Tooltip />
          <Line type="monotone" dataKey="count" />
        </LineChart>
      </div>
    </div>
  );
}

