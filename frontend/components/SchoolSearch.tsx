"use client";
import { useMemo, useState } from "react";
import { SCHOOLS } from "@/lib/schools"; 
import Link from "next/link";
import { Search, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SchoolAvatar from "./SchoolAvatar"; 

const PROVISIONED_DEMO_SLUG = "seattle-central-college"; 

export default function SchoolSearch() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return SCHOOLS.slice(0, 3); 
    
    const query = q.toLowerCase();
    return SCHOOLS.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.slug.toLowerCase().includes(query)
    ).slice(0, 3);
  }, [q]);

  type WrapperProps = {
    children: React.ReactNode;
    className: string;
    key: string;
    href?: string; // href là optional
    style?: React.CSSProperties; // style là optional
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Find your school to get started..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-300 bg-white shadow-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <p className="text-center text-xs text-slate-500 mt-3">
        (Showing demo schools. Your provisioned school will appear here and become active.)
      </p>

      <AnimatePresence>
        {filtered.length > 0 && (
          <motion.div 
            className="mt-4 grid gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filtered.map(school => {
              const isLinkActive = school.slug === PROVISIONED_DEMO_SLUG;
              const WrapperComponent: any = isLinkActive ? Link : 'div'; 
              const wrapperProps: WrapperProps = {
                key: school.slug,
                className: `flex items-center gap-4 p-4 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-soft ${isLinkActive ? 'hover:shadow-lg hover:border-blue-300 transition-all' : ''}`,
                children: ( 
                  <>
                    <SchoolAvatar
                      src={school.logo}
                      name={school.name}
                      className="w-10 h-10 text-sm flex-shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="font-semibold text-slate-800 truncate">{school.name}</div>
                      <div className="text-sm text-slate-500 flex items-center gap-1">
                        <MapPin size={12} /> 
                        <span className="truncate">{school.location}</span>
                      </div>
                    </div>
                    {!isLinkActive && (
                      <span className="ml-auto text-xs font-semibold text-slate-400">(Demo)</span>
                    )}
                  </>
                )
              };

              // Thêm props có điều kiện
              if (isLinkActive) {
                wrapperProps.href = `/${school.slug}`;
              } else {
                wrapperProps.style = { opacity: 0.6, cursor: 'not-allowed' };
              }

              return <WrapperComponent {...wrapperProps} />;
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
