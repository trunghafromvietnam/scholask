"use client";
import { motion } from "framer-motion";
import SchoolSearch from "@/components/SchoolSearch";
import FloatingEduDecorPro from "@/components/FloatingEduDecorPro";
import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react"; 

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: .5 } } };

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* 1. Backgrounds */}
      <div className="absolute inset-0 mesh" />
      <FloatingEduDecorPro />

      {/* 2. Navigation */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Scholask Logo"
            width={36}
            height={36}
            className="w-9 h-9"
          />
          {/* Dùng font 'grotesk' đặc biệt */}
          <div className="font-grotesk font-bold text-2xl text-slate-900">
            Scholask
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            href="/provision" 
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            School Provisioning
          </Link>
          <Link 
            href="/admin/login" 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <LogIn size={14} />
            Admin Portal
          </Link>
        </div>
      </nav>

      {/* 3. Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <motion.div variants={fade} initial="hidden" animate="show">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4 tracking-tight">
            The "AI SOUL" for Every School
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Multi-tenant RAG, automated workflows, and Edge AI for offline reliability.
            Built for Admissions, Registrar, and Student Success of Educational System.
          </p>
        </motion.div>

        <motion.div variants={fade} initial="hidden" animate="show" transition={{ delay: .1 }} className="mt-10">
          <SchoolSearch />
        </motion.div>
      </section>

       {/* 4. Feature Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { t: "Automated Workflows", d: "Turn forms into trackable tickets for Admissions, Registrar & International." },
            { t: "Verified Knowledge", d: "Crawl official pages, re-index diffs, and cite every answer." },
            { t: "Offline & Edge-First", d: "TF-IDF fallback and request queuing via Edge AI nodes. (T-Mobile Track)" },
          ].map((f, i) => (
            <motion.div key={i} className="bg-white/80 backdrop-blur rounded-3xl p-6 border border-gray-200 shadow-soft float-slow"
              initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }} transition={{ delay: .1*i + .2 }}>
              <div className="text-xl font-semibold text-slate-800">{f.t}</div>
              <div className="text-sm text-slate-600 mt-1">{f.d}</div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}