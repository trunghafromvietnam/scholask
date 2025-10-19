"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart2, Database, Ticket, Users, AlertTriangle, Wifi, Cloud, Zap, Cpu, Clock, Loader2 
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'; 
import { apiFetch, getInsightsSummary, listDocuments } from "@/lib/api";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#ef4444", "#06b6d4"];

// --- Component Card --- 
const DashboardCard = ({ title, value, description, href, icon, bgColor = 'bg-white', textColor = 'text-slate-800', delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.08, ease: "easeOut", duration: 0.4 }}
  >
    <Link href={href || "#"} className={`block p-5 rounded-xl border border-slate-200 shadow-soft hover:shadow-lg hover:border-blue-300 transition-all group ${bgColor} ${textColor} h-full`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className={`p-1.5 rounded-lg ${href ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{icon}</div>
      </div>
      {value && <div className="text-3xl font-bold mb-1">{value}</div>}
      <p className="text-xs text-slate-500">{description}</p>
    </Link>
  </motion.div>
);

// --- Component chính ---
export default function AdminDashboardPage({ params }: { params: { school: string } }) {
  const { school } = params;
  const prettySchool = useMemo(() => school ? school.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Admin", [school]);

  // --- State cho dữ liệu động ---
  const [insights, setInsights] = useState<any>(null); // Dữ liệu từ /insights/summary
  const [docCount, setDocCount] = useState<number | null>(null); // Số lượng documents
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Mock Data cho Edge Status (Cập nhật sau nếu có API thật) ---
  const edgeStatus = { online: true, lastSync: "1 min ago", network: "5G", latency: 42 };

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      if (!school) return;
      // Fetch Insights
      setLoadingInsights(true);
      try {
        const insightsData = await getInsightsSummary(school); // Gọi API đã sửa
        setInsights(insightsData);
      } catch (err: any) { setError(err.message || "Failed to load insights."); }
      finally { setLoadingInsights(false); }

      // Fetch Document Count
      setLoadingDocs(true);
      try {
         const docsData = await listDocuments(school);
         setDocCount(docsData?.length ?? 0);
      } catch (err: any) { setError(err.message || "Failed to load documents."); }
      finally { setLoadingDocs(false); }
    };
    fetchData();
  }, [school]);

  // Chuẩn bị dữ liệu biểu đồ Top Topics
  const topTopicsChartData = insights?.top_topics?.map((t: any) => ({ name: t.topic, queries: t.count })) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Overview for <span className="font-semibold">{prettySchool}</span>.
        </p>
      </motion.div>

      {/* Hiển thị lỗi chung */}
      {error && (
         <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <AlertTriangle size={18} /> {error}
         </div>
      )}

      {/* Phần System Status & Edge */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <DashboardCard
              title="Cloud Connection"
              value={!OFFLINE ? "Active" : "Disabled"} // Kiểm tra biến OFFLINE (nếu có thể đọc từ env client?)
              description={!OFFLINE ? "Using AWS Bedrock" : "Running Locally"}
              icon={<Cloud size={18} />}
              bgColor={!OFFLINE ? "bg-green-50" : "bg-orange-50"}
              textColor={!OFFLINE ? "text-green-800" : "text-orange-800"}
              delay={0}
           />
           <DashboardCard
              title="Edge Node"
              value={edgeStatus.online ? "Online" : "Offline"}
              description={`Last Sync: ${edgeStatus.lastSync}`}
              icon={<Cpu size={18} />}
              bgColor={edgeStatus.online ? "bg-sky-50" : "bg-red-50"}
              textColor={edgeStatus.online ? "text-sky-800" : "text-red-800"}
              delay={1}
           />
           <DashboardCard
              title="Network (Simulated)"
              value={edgeStatus.network}
              description={`Latency: ~${edgeStatus.latency}ms`}
              icon={<Wifi size={18} />}
              bgColor="bg-purple-50" textColor="text-purple-800"
              delay={2}
           />
           {/* Thẻ trống để căn chỉnh grid hoặc thêm stat khác */}
           <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-sm">
              More Stats Soon
           </div>
        </div>
      </section>

      {/* Phần Knowledge & Tickets */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Content & Workflow</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard
                title="Knowledge Base"
                value={loadingDocs ? "..." : (docCount ?? 'N/A')}
                description="Ingested Documents"
                href={`/admin/${school}/knowledge`}
                icon={<Database size={18}/>}
                delay={3}
            />
             <DashboardCard
                title="Open Tickets"
                value={loadingInsights ? "..." : (insights?.open_tickets ?? 'N/A')} // Cần backend trả về
                description="Awaiting Department Action"
                href={`/admin/${school}/tickets`}
                icon={<Ticket size={18}/>}
                delay={4}
            />
             <DashboardCard
                title="Tickets Needing Info"
                value={loadingInsights ? "..." : (insights?.tickets_needing_info ?? 'N/A')} // Cần backend trả về
                description="Awaiting Student Response"
                href={`/admin/${school}/tickets?status=Needs+Info`} // Link tới filter
                icon={<AlertTriangle size={18}/>}
                bgColor="bg-yellow-50" textColor="text-yellow-800"
                delay={5}
            />
             <DashboardCard
                title="Avg. Resolution Time"
                value={loadingInsights ? "..." : (insights?.avg_resolution_hours ? `${insights.avg_resolution_hours}h` : 'N/A')} // Cần backend trả về
                description="Last 7 Days"
                icon={<Clock size={18}/>}
                delay={6}
            />
         </div>
      </section>

      {/* Phần Chat Insights */}
      <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Chatbot Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card các chỉ số chính */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft order-1 md:order-2">
                  <h3 className="text-base font-semibold text-slate-700 mb-4">Key Metrics</h3>
                  <div className="space-y-3">
                      <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500">Queries Today</span>
                          <span className="text-lg font-bold text-slate-800">{loadingInsights ? "..." : (insights?.queries_today ?? 'N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500">Avg Response Time</span>
                           <span className="text-lg font-bold text-slate-800">{loadingInsights ? "..." : (insights?.avg_latency_ms ? `${insights.avg_latency_ms}ms` : 'N/A')}</span>
                      </div>
                       <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500">Unanswered Rate</span>
                           <span className="text-lg font-bold text-red-600">{loadingInsights ? "..." : (insights?.unanswered_rate_pct ? `${insights.unanswered_rate_pct.toFixed(1)}%` : 'N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500">Satisfaction (Est.)</span>
                           <span className="text-lg font-bold text-green-600">{loadingInsights ? "..." : (insights?.satisfaction_rate_pct ? `${insights.satisfaction_rate_pct.toFixed(1)}%` : 'N/A')}</span>
                      </div>
                  </div>
              </div>

              {/* Biểu đồ Top Topics */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-soft order-2 md:order-1">
                 <h3 className="text-base font-semibold text-slate-700 mb-1">Top Topics Asked</h3>
                 {loadingInsights ? (
                     <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500"/></div>
                 ) : topTopicsChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={topTopicsChartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={120} fontSize={11} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{fontSize: '12px', borderRadius: '8px'}}/>
                        <Bar dataKey="queries" fill="#3b82f6" barSize={15} radius={[0, 4, 4, 0]}>
                            {topTopicsChartData.map((_entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                 ) : (
                    <p className="h-48 flex items-center justify-center text-sm text-slate-500 italic">Not enough data for top topics.</p>
                 )}
              </div>
          </div>
      </section>

    </div>
  );
}

// --- Biến môi trường giả lập (XÓA KHI DEPLOY) ---
const OFFLINE = process.env.NEXT_PUBLIC_OFFLINE_MODE === '1'; // Ví dụ đọc từ env frontend