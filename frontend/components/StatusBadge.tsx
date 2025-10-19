import React from 'react';
import { CheckCircle, Loader, AlertCircle, XCircle } from 'lucide-react';

const statusConfig = {
  "Submitted": { color: "bg-blue-100 text-blue-700", icon: <Loader size={12} className="animate-spin" /> },
  "In review": { color: "bg-yellow-100 text-yellow-700", icon: <Loader size={12} className="animate-spin" /> },
  "Needs info": { color: "bg-orange-100 text-orange-700", icon: <AlertCircle size={12} /> },
  "Approved": { color: "bg-green-100 text-green-700", icon: <CheckCircle size={12} /> },
  "Rejected": { color: "bg-red-100 text-red-700", icon: <XCircle size={12} /> },
  "default": { color: "bg-slate-100 text-slate-700", icon: null },
};

export default function StatusBadge({ status, large = false }: { status: string, large?: boolean }) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.default;
  const size = large ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${size} ${config.color}`}>
      {config.icon}
      {status}
    </span>
  );
}
