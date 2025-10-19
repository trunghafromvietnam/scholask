// app/admin/[school]/layout.tsx
"use client";
import { useState, useMemo, ReactNode } from "react";
import CollapsibleSidebar from "@/components/CollapsibleSidebar";
// Đảm bảo bạn đã TẠO file này và export object đúng tên
import AdminSidebar from "@/components/AdminSideBar";
import Link from 'next/link';

export default function AdminLayout({ params, children }: { params: { school: string }, children: ReactNode }) {
  const { school } = params;
  const [collapsed, setCollapsed] = useState(false); // Sidebar state: true = collapsed

  // Format school name for display
  const prettySchool = useMemo(() =>
     school ? school.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Admin",
     [school]
  );

  return (
    // Main container with dynamic padding for sidebar
    <div
      className="min-h-screen bg-slate-100" // Admin area background
      style={{
        // Use paddingLeft for smoother content shift
        paddingLeft: collapsed ? "0px" : "var(--sidebar-w, 260px)",
        transition: 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' // Smoother transition
      }}
    >
      {/* Sidebar Component */}
      <CollapsibleSidebar
        title="Admin Console" // Fixed title
        subtitle={prettySchool} // Dynamic subtitle (school name)
        // Ensure AdminSidebar object is correctly imported and functions exist
        items={AdminSidebar.items(school)}
        bottomSlot={AdminSidebar.bottomSlot(school)} // Pass school slug if needed by bottom slot
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)} // Toggle function
      />

      {/* Main Content Area (Header + Page Content) */}
      {/* This div shifts based on the paddingLeft of the parent */}
      <div>
        {/* Sticky Header */}
        <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30 flex items-center px-4 md:px-8 justify-between">
          {/* Display current section title or school name */}
          <div className="text-sm font-semibold text-slate-800">{prettySchool} - Admin Portal</div>
          {/* Link to view the live student site */}
          <Link
            href={`/${school}`}
            target="_blank" // Open in new tab
            rel="noopener noreferrer"
            className="text-sm px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition-colors"
          >
            View Student Site
          </Link>
        </header>

        {/* Page Content */}
        {/* Padding applied here ensures content doesn't stick to edges */}
        <main className="p-4 md:p-8 min-h-[calc(100vh-56px)]">
          {children} {/* Renders the specific page (e.g., insights, knowledge) */}
        </main>
      </div>
    </div>
  );
}

