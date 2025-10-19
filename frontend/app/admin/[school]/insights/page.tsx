"use client";
import { useMemo, useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts"; // Thêm Legend
import { apiFetch } from "@/lib/api"; 
import { motion } from "framer-motion";
import { Loader2, AlertTriangle } from "lucide-react"; 

const COLORS = ["#2563eb", "#16a34a", "#9333ea", "#f59e0b", "#ef4444", "#06b6d4"];

// Định nghĩa type cho dữ liệu trả về từ API (dựa trên mock data backend)
type InsightsData = {
  queries_today: number;
  avg_latency_ms: number;
  unanswered_rate_pct: number;
  top_topics: { topic: string; count: number }[];
  satisfaction_rate_pct: number;
  // Thêm các trường khác nếu API trả về
  daily?: { d: string; q: number; rt_ms?: number }[]; // Dữ liệu daily từ mock cũ
  langs?: { name: string; v: number }[]; // Dữ liệu langs từ mock cũ
  csat?: { name: string; v: number }[]; // Dữ liệu csat từ mock cũ
};


export default function AdminInsightsPage({ params }: { params: { school: string } }) {
  const { school } = params;
  const [data, setData] = useState<InsightsData | null>(null); // State với type
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format tên trường
  const prettySchool = useMemo(() =>
    school ? school.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "School",
    [school]
  );

  useEffect(() => {
    const fetchInsights = async () => {
      if (!school) return; // Không fetch nếu không có slug
      setLoading(true);
      setError(null);
      setData(null); // Xóa data cũ

      try {
        console.log(`Fetching insights for ${school}...`); // Log
        // *** SỬA LỖI URL VÀ DÙNG APIFETCH ***
        const insights = await apiFetch(`/admin/insights/summary?school=${encodeURIComponent(school)}`);
        console.log("Insights data received:", insights); // Log
        // Giả sử API trả về đúng cấu trúc InsightsData
        setData(insights);
      } catch (err: any) {
        console.error("Failed to fetch insights:", err);
        setError(err.message || "Could not load insights data.");
        // Fallback data (tùy chọn, có thể bỏ)
        // setData({ ... mock data ... });
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [school]); // Chạy lại khi 'school' thay đổi

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="ml-3 text-slate-500">Loading insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
        <AlertTriangle size={18} /> Error loading insights: {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-slate-500">No insights data available.</div>;
  }

  // Chuẩn bị dữ liệu cho biểu đồ (lấy từ data hoặc dùng mock nếu API chưa trả về đúng)
  const dailyData = data.daily || []; // Fallback nếu API chưa có daily
  const topTopicsData = data.top_topics || [];
  const langData = data.langs || [];
  const csatData = data.csat || [];

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Insights Dashboard</h1>
        <p className="text-slate-600">
          Usage analytics for <span className="font-semibold">{prettySchool}</span>.
        </p>
      </motion.div>

      {/* Grid chứa các biểu đồ */}
      <motion.div
        className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        {/* Biểu đồ Queries Today & Avg Latency (Ví dụ dùng Stat Card) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft">
           <h3 className="text-lg font-semibold text-slate-700 mb-3">Today's Activity</h3>
           <div className="flex justify-around">
               <div className="text-center">
                   <div className="text-3xl font-bold text-blue-600">{data.queries_today ?? 'N/A'}</div>
                   <div className="text-sm text-slate-500">Queries Today</div>
               </div>
               <div className="text-center">
                   <div className="text-3xl font-bold text-green-600">{data.avg_latency_ms ? `${data.avg_latency_ms}ms` : 'N/A'}</div>
                   <div className="text-sm text-slate-500">Avg Response</div>
               </div>
                <div className="text-center">
                   <div className="text-3xl font-bold text-red-600">{data.unanswered_rate_pct ? `${data.unanswered_rate_pct}%` : 'N/A'}</div>
                   <div className="text-sm text-slate-500">Unanswered Rate</div>
               </div>
           </div>
        </div>

        {/* Biểu đồ Top Topics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-700 mb-3">Most Common Topics</h3>
          {topTopicsData.length > 0 ? (
             <ul className="space-y-2">
                {topTopicsData.map((topic, i) => (
                    <li key={topic.topic} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{i+1}. {topic.topic}</span>
                        <span className="font-semibold text-slate-800">{topic.count} queries</span>
                    </li>
                ))}
             </ul>
          ) : (
              <p className="text-sm text-slate-500 italic">Not enough data for top topics yet.</p>
          )}
        </div>

        {/* Biểu đồ Languages */}
        {langData.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-soft">
            <h3 className="text-lg font-semibold text-slate-700 mb-1 text-center">Language Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={langData} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {langData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} queries`, name]}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Biểu đồ Satisfaction */}
        {csatData.length > 0 && (
           <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-soft">
              <h3 className="text-lg font-semibold text-slate-700 mb-1 text-center">User Satisfaction (CSAT)</h3>
             <ResponsiveContainer width="100%" height={240}>
               <PieChart>
                 <Pie data={csatData} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} label>
                   {csatData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(value, name) => [`${value} responses`, name]}/>
                 {/* <Legend /> */}
               </PieChart>
             </ResponsiveContainer>
           </div>
        )}

        {/* Biểu đồ Daily Queries (nếu có data) */}
        {dailyData.length > 0 && (
           <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:col-span-2 shadow-soft"> {/* Span 2 columns */}
             <h3 className="text-lg font-semibold text-slate-700 mb-3">Daily Query Volume</h3>
             <ResponsiveContainer width="100%" height={300}>
               <LineChart data={dailyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> {/* Adjusted margins */}
                 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/> {/* Lighter grid */}
                 <XAxis dataKey="d" fontSize={12} tickLine={false} axisLine={false}/>
                 <YAxis fontSize={12} tickLine={false} axisLine={false} width={40}/> {/* Added width */}
                 <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 12px'}}/>
                 <Legend verticalAlign="top" height={36}/>
                 <Line type="monotone" dataKey="q" name="Queries" stroke={COLORS[0]} strokeWidth={2} dot={false} activeDot={{ r: 6 }}/>
                 {/* <Line type="monotone" dataKey="rt_ms" name="Avg Resp. Time (ms)" stroke={COLORS[1]} strokeWidth={2} dot={false} yAxisId="right"/> */}
               </LineChart>
             </ResponsiveContainer>
           </div>
        )}

      </motion.div>
    </div>
  );
}