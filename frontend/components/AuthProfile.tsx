"use client";
import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard, CheckSquare, User } from "lucide-react";
import Link from "next/link";

interface AuthProfileProps {
  userEmail: string | null;
  userRole: string | null;
  onLogout: () => void;
}

export default function AuthProfile({ userEmail, userRole, onLogout }: AuthProfileProps) {
  const [menu, setMenu] = useState(false);

  const hasAuth = Boolean(userEmail && userRole);
  const initial = userEmail?.[0]?.toUpperCase() ?? "?";

  // Đóng menu nếu đăng xuất
  useEffect(() => {
    if (!hasAuth) setMenu(false);
  }, [hasAuth]);

  if (!hasAuth) {
    // Nút Sign In / Sign Up (parent sẽ mở modal)
    return (
      <button
        onClick={onLogout /* parent nên mở modal đăng nhập ở đây */}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <User size={18} />
        <span>Sign In / Sign Up</span>
      </button>
    );
  }

  return (
    <div className="px-3 py-2.5">
      {/* Hàng thông tin */}
      <div className="flex items-center gap-3">
        {/* NÚT AVATAR TRÒN - chỉ riêng nó là click mở menu */}
        <button
          onClick={() => setMenu(v => !v)}
          aria-haspopup="menu"
          aria-expanded={menu}
          title={userEmail!}
          className="shrink-0"
        >
          {/* KHỐI TRÒN THẬT SỰ: không padding, w=h, rounded-full */}
          <div className="w-10 aspect-square rounded-full bg-slate-800 text-white grid place-items-center leading-none font-semibold ring-1 ring-slate-300 shadow-sm">
            {initial}
          </div>
        </button>
  
        {/* Text đứng cạnh, KHÔNG ảnh hưởng hình tròn */}
        <div className="flex flex-col text-left">
          <span className="text-slate-900 text-sm">{userEmail}</span>
          <span className="text-slate-500 text-xs capitalize">{userRole}</span>
        </div>
      </div>
  
      {/* Dropdown menu */}
      {menu && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
          <Link href="/tasks" className="block px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
            <CheckSquare size={16} /> My Tasks
          </Link>
          <Link href="/dashboard" className="block px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}



