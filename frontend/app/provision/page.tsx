"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowRight } from "lucide-react";
import { setAuth } from "@/lib/auth"; 

// Hàm này sẽ gọi API để tạo cả School và Owner
async function provisionSchool(schoolName: string, slug: string, email: string, password: string) {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const r = await fetch(`${base}/admin/provision`, { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      school_name: schoolName,
      slug: slug,
      owner_email: email,
      owner_password: password, 
    }),
  });

  const js = await r.json();
  if (!r.ok || !js?.token) { 
    throw new Error(js?.detail || "Provisioning failed");
  }
  return js.token;
}

export default function ProvisionPage() {
  const [schoolName, setSchoolName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!schoolName || !slug || !email || !password) {
      setError("All fields are required.");
      return;
    }
    setBusy(true);

    try {
      const token = await provisionSchool(schoolName, slug, email, password);
      
      // Đăng nhập ngay lập tức
      setAuth(token); // Sử dụng hàm setAuth mới
      
      // Chuyển hướng đến trang ingest
      window.location.href = `/admin/${slug}/knowledge`;
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <Image src="/logo.png" alt="Logo" width={32} height={32} />
          <div className="font-grotesk font-bold text-2xl text-slate-900">Scholask</div>
        </Link>
        
        <form 
          onSubmit={submit}
          className="bg-white/80 backdrop-blur-lg rounded-3xl border border-slate-200 p-8 shadow-2xl space-y-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Provision Your School</h1>
            <p className="text-sm text-slate-500">Create your school's tenant and admin account.</p>
          </div>
          
          {/* Step 1: School */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-blue-600">Step 1: School Details</legend>
            <div>
              <label className="text-sm font-medium text-slate-700">School Name</label>
              <input 
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="e.g., Seattle Central College"
                className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Preferred Subdomain (Slug)</label>
              <div className="flex items-center">
                <input 
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g., seattle-central"
                  className="mt-1 w-full border border-slate-300 rounded-l-lg px-4 py-2.5 text-sm"
                />
                <span className="mt-1 border border-l-0 border-slate-300 rounded-r-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500">
                  .scholask.com
                </span>
              </div>
            </div>
          </fieldset>
          
          {/* Step 2: Admin */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-blue-600">Step 2: Owner Account</legend>
            <div>
              <label className="text-sm font-medium text-slate-700">Your Admin Email</label>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
          </fieldset>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:bg-slate-400"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : "Create & Launch"}
            {!busy && <ArrowRight size={18} />}
          </button>
          
          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/admin/login" className="font-medium text-blue-600 hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </motion.div>
    </main>
  );
}




