"use client";
import { useState } from "react";
import { setAuth } from "@/lib/auth"; 
import { Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
// Import the type from the modal component file
import type { StudentRoleType } from "./StudentAuthModal"; 

// Hàm gọi API route để set cookie
async function setSessionCookie(token: string, role: string) { 
  try {
    const response = await fetch("/api/session", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, role }),
    });
    if (!response.ok) console.error("Failed to set session cookie:", response.statusText);
    else console.log("Session cookie request sent successfully.");
  } catch (error) { console.error("Error calling /api/session:", error); }
}

export default function AuthForm({
  role,
  studentRoleType, 
  school,
  mode,
  onSuccess
}: {
  role: "student" | "admin";
  studentRoleType?: StudentRoleType; 
  school?: string;
  mode: "signin" | "signup";
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); 
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  // Tên chỉ hiện khi đăng ký student
  const showNameField = role === 'student' && mode === 'signup';

  const submit = async () => {
    setError(null);
    if (!email || !password || (showNameField && !name)) {
      setError("Please fill out all required fields.");
      return;
    }
    setBusy(true);

    try {
      let url = "";
      let body: any = { email, password };
      let fetchMethod = "POST";

      if (mode === "signin") {
        url = `${base}/auth/login`;
      } else { // mode === "signup"
        if (role === 'student') {
          url = `${base}/auth/register`; 
          body.name = name;
          if (!school) throw new Error("School slug is required for student registration.");
          body.school_slug = school;
          // *** SỬ DỤNG studentRoleType TỪ PROP ***
          body.role = studentRoleType || 'applicant'; // Gửi role đã chọn (student/applicant)
        } else {
           throw new Error("Admin signup is handled via /provision page.");
        }
      }

      const r = await fetch(url, {
        method: fetchMethod, // Sử dụng biến fetchMethod
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const js = await r.json(); 
      console.log("Backend Auth Response:", js); 
      if (!r.ok || !js?.token) throw new Error(js?.detail || `Authentication failed (${r.status})`);

      const actualRole = js.role; // Role thật từ backend response
      const actualSchoolSlug = js.school_slug || school; // Lấy slug từ response hoặc prop

      console.log("Authentication successful:", { token: js.token, role: actualRole, school: actualSchoolSlug });

      // 1. Save token to localStorage
      setAuth(js.token);

      // 2. Set HTTPOnly cookie via API route
      await setSessionCookie(js.token, actualRole); 

      // 3. Handle redirect or callback
      if (onSuccess) {
        console.log("Calling onSuccess callback (modal).");
        onSuccess();
      } else {
        console.log("Attempting redirect..."); // Log start of redirect check
        // Check Admin/Owner redirect conditions explicitly
        const isAdminOrOwner = actualRole === "admin" || actualRole === "owner";
        const hasAdminSlug = !!actualSchoolSlug; // Check if slug exists and is not empty

        console.log(`Checking admin redirect: isAdminOrOwner=${isAdminOrOwner}, hasAdminSlug=${hasAdminSlug}`);

        if (isAdminOrOwner && hasAdminSlug) {
           console.log(` --> REDIRECTING admin/owner to /admin/${actualSchoolSlug}`);
           router.push(`/admin/${actualSchoolSlug}`); // Redirect admin/owner
        } 
        // Check Student/Applicant redirect conditions explicitly
        else if ((actualRole === "student" || actualRole === "applicant") && (actualSchoolSlug || school)) {
           const targetSlug = actualSchoolSlug || school;
           console.log(` --> REDIRECTING ${actualRole} to /${targetSlug}/tracking`);
           router.push(`/${targetSlug}/tracking`); // Redirect student/applicant
        } 
        // Else block: Log exactly why it failed
        else {
           console.error(" --> REDIRECT FAILED: Conditions not met.");
           if (!isAdminOrOwner && (actualRole === "admin" || actualRole === "owner")) {
               console.error("    Reason: Role was admin/owner but slug was missing or invalid:", actualSchoolSlug);
           } else if (!hasAdminSlug && (actualRole === "admin" || actualRole === "owner")) {
                console.error("    Reason: Role was admin/owner but slug was missing:", actualSchoolSlug);
           } else if (!(actualRole === "student" || actualRole === "applicant") && (actualRole === "student" || actualRole === "applicant")) {
                console.error("    Reason: Role was not student/applicant as expected:", actualRole);
           } else if (!(actualSchoolSlug || school) && (actualRole === "student" || actualRole === "applicant")) {
               console.error("    Reason: Role was student/applicant but slug was missing:", actualSchoolSlug, school);
           } else {
                console.error("    Reason: Unknown state.", { actualRole, actualSchoolSlug });
           }
           setError("Login successful, but redirect failed. Please navigate manually.");
        }
      }
    } catch (e: any) {
      console.error("Authentication submit error:", e);
      setError(e?.message || "An unknown error occurred.");
    } finally {
      setBusy(false);
    }
  };

  // --- JSX Render ---
  return (
    <div className="space-y-4">
      {/* Name Field (Conditional) */}
      {showNameField && (
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Full Name</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your full name"
            value={name}
            onChange={e => setName(e.target.value)}
            required // Make required if shown
          />
        </div>
      )}

      {/* Email */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
        <input
          type="email"
          autoComplete="email"
          required
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      {/* Password */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          minLength={mode === 'signup' ? 8 : undefined} // Add minLength for signup
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={mode === 'signin' ? 'Your password' : 'Create a password (min. 8 characters)'}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={submit} // Changed to onClick to prevent default form submission if wrapped in <form>
        type="button" // Change type to button
        disabled={busy}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-150
                    ${busy 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" // Added focus styles
                    }`}
      >
        {busy && <Loader2 size={18} className="animate-spin" />}
        {busy ? "Please wait…" : (mode === "signin" ? "Sign In" : "Create Account")}
      </button>
    </div>
  );
}