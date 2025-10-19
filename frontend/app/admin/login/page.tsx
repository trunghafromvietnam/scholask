"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import AuthForm from "@/components/AuthForm"; 

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <Image src="/logo.png" alt="Logo" width={32} height={32} />
          <div className="font-grotesk font-bold text-2xl text-slate-900">Scholask</div>
        </Link>
        
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl border border-slate-200 p-8 shadow-2xl">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
            <p className="text-sm text-slate-500">Sign in to manage your school.</p>
          </div>
          
          <div className="mt-6">
            {/* AuthForm giờ chỉ dùng cho admin-signin.
              Backend sẽ tự biết user này thuộc trường nào sau khi login.
            */}
            <AuthForm 
              role="admin" 
              mode="signin"
              // Không cần prop `school` khi đăng nhập
            />
          </div>
          
          <p className="text-center text-sm text-slate-500 mt-6">
            Need to provision a new school?{" "}
            <Link href="/provision" className="font-medium text-blue-600 hover:underline">
              Get Started
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
