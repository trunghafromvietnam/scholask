"use client"; 

import {
  MessageCircle,
  FileText,
  CheckSquare,
  User,
  LogOut,
} from "lucide-react";
import { clearAuth } from "@/lib/auth";
import AuthProfile from "./AuthProfile"; 


type AuthData = { token: string; role: string; email: string; school_id: number } | null;

type MenuItem = { name: string; href: string; icon: React.ReactNode };

const getItems = (school: string, role: string | null): MenuItem[] => {
    const baseItems: MenuItem[] = [
      { name: "AI Chat", href: `/${school}`, icon: <MessageCircle size={18} /> },
    ];
  
    const applicantItems: MenuItem[] = [
      { name: "Apply Services", href: `/${school}/apply-services`, icon: <FileText size={18} /> },
      { name: "Track Application", href: `/${school}/tracking`, icon: <CheckSquare size={18} /> },
    ];
  
    const studentItems: MenuItem[] = [
    ];
  
    if (role === 'student') return [...baseItems, ...studentItems];
    return [...baseItems, ...applicantItems]; 
  };

const bottomSlotContent = (onLoginClick: () => void, auth: AuthData) => {
    const handleLogout = async () => {
      await clearAuth(); // sẽ dispatch sự kiện
    };
  
    if (auth) {
      return (
        <AuthProfile
          userEmail={auth.email}
          userRole={auth.role}
          onLogout={handleLogout}
        />
      );
    }
  
    // Chưa đăng nhập
    return (
      <button
        onClick={onLoginClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <User size={18} />
        <span>Sign In / Sign Up</span>
      </button>
    );
  };

const StudentSidebar = {
  items: getItems,
  bottomSlot: bottomSlotContent, // Export the function that returns the JSX
};

// Export the object as the default export of this module
export default StudentSidebar;