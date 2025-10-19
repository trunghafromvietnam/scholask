"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; 
import { X, GraduationCap, UserCheck, UserPlus } from "lucide-react";
import AuthForm from "./AuthForm"; 

// Export type for AuthForm to use
export type StudentRoleType = "student" | "applicant"; // "student" = Current, "applicant" = Potential 

export default function StudentAuthModal({
  school,
  onClose,
  onSuccess,
}: {
  school: string; // The slug of the school
  onClose: () => void;
  onSuccess: () => void; 
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // Default to 'applicant' (Potential Student) when signing up
  const [studentRole, setStudentRole] = useState<StudentRoleType>("applicant"); 

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      aria-labelledby="student-auth-modal-title" // Accessibility
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <motion.div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md" 
        onClick={onClose} 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-hidden="true" // Accessibility
      />
      
      {/* Modal Card */}
      <motion.div
        className="relative z-10 w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8" // Adjusted padding
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ delay: 0.1, ease: "easeOut", duration: 0.3 }}
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors" // Improved styling
          aria-label="Close modal" // Accessibility
        >
          <X size={20} />
        </button>
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-white"> {/* Gradient & Ring */}
            <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <h1 id="student-auth-modal-title" className="text-xl sm:text-2xl font-bold text-slate-900">Student Portal</h1>
          <p className="text-sm text-slate-500 mt-1 px-4"> {/* Added padding */}
            {mode === 'signin' 
              ? `Sign in to access services for ${school.replace(/-/g,' ')}.` 
              : "Create an account to get started."}
          </p>
        </div>

        {/* Role Selection (only on signup) */}
        <AnimatePresence>
          {mode === 'signup' && (
            <motion.div 
              className="mb-5 space-y-2" // Adjusted margin
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-medium text-slate-700 text-center">Please select your status:</p>
              <div className="flex gap-3 justify-center">
                <button 
                  type="button"
                  onClick={() => setStudentRole('applicant')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border-2 text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    studentRole === 'applicant' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <UserPlus size={16} /> Prospective
                </button>
                <button 
                  type="button"
                  onClick={() => setStudentRole('student')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border-2 text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    studentRole === 'student' 
                    ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm' 
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                   <UserCheck size={16} /> Current Student
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* AuthForm */}
        <AnimatePresence mode="wait">
          <motion.div
             key={mode} // Animate when mode changes
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.2 }}
          >
            <AuthForm
              role="student" 
              studentRoleType={studentRole} // Pass selected role type
              school={school} 
              mode={mode}
              onSuccess={onSuccess}
            />
          </motion.div>
        </AnimatePresence>
        
        {/* Toggle Sign in / Sign up */}
        <div className="text-center mt-6 pt-4 border-t border-slate-200"> {/* Added border */}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            {mode === "signin"
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}