"use client";
import { ChevronLeft, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type Item = { name: string; href: string; icon: React.ReactNode };

export default function CollapsibleSidebar({
  title, // School name
  subtitle, // "Student Portal" or "Admin Console"
  items,
  bottomSlot,
  collapsed,
  onToggle,
}: {
  title: string;
  subtitle: string;
  items: Item[];
  bottomSlot: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const sidebarWidth = 260; // Fixed sidebar width

  // Variants cho animation nội dung sidebar
  const contentVariants = {
    open: {
      opacity: 1,
      transition: { duration: 0.2, delay: 0.15 } // Xuất hiện sau khi sidebar mở
    },
    closed: {
      opacity: 0,
      transition: { duration: 0.1 } // Biến mất nhanh khi sidebar đóng
    }
  };

  return (
    <>
      {/* Sidebar Container */}
      <motion.aside
        className="fixed top-0 left-0 z-40 h-dvh bg-white border-r border-slate-200 flex flex-col shadow-lg overflow-x-hidden" // Thêm h-dvh, overflow-x-hidden
        initial={false} // Không animate lần đầu
        animate={{ width: collapsed ? 0 : sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }} // Easing mượt hơn
        // Quan trọng: CSS variable để layout ngoài điều chỉnh margin/padding
        style={{ '--sidebar-w': `${sidebarWidth}px` } as React.CSSProperties}
      >
        {/* Header */}
        {/* Thêm min-w-[${sidebarWidth}px] để nội dung không bị vỡ khi đóng */}
        <div className={`p-4 border-b border-slate-200 flex-shrink-0 flex items-start justify-between min-w-[${sidebarWidth}px]`}>
          <motion.div
             className="overflow-hidden flex-grow mr-2" // Thêm flex-grow, mr-2
             variants={contentVariants}
             animate={collapsed ? "closed" : "open"}
          >
            <div className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">{subtitle}</div>
            {/* Tên trường: Cho phép xuống dòng, giới hạn 2 dòng */}
            <div className="font-bold text-lg text-slate-800 break-words leading-tight line-clamp-2"> {/* Thêm line-clamp-2 */}
                {title}
            </div>
          </motion.div>

          {/* Nút Collapse (ChevronLeft) - chỉ hiện khi sidebar mở */}
          {!collapsed && (
            <motion.button
                onClick={onToggle}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 flex-shrink-0 mt-0.5" // Thêm mt-0.5 căn chỉnh
                title="Close Sidebar"
                variants={contentVariants} // Dùng chung animation
                animate={collapsed ? "closed" : "open"}
            >
                <ChevronLeft size={20} />
            </motion.button>
          )}
        </div>

        {/* Nav Items */}
        {/* Thêm min-w-[${sidebarWidth}px] */}
        <motion.nav
           className={`flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin min-w-[${sidebarWidth}px]`}
           variants={contentVariants}
           animate={collapsed ? "closed" : "open"}
           style={{ pointerEvents: collapsed ? 'none' : 'auto' }}
        >
          {items.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-100 ${
                  isActive
                    ? "bg-blue-100 text-blue-700 font-semibold" // Nổi bật hơn khi active
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {/* Icon với kích thước cố định */}
                <span className="w-5 flex-shrink-0 flex justify-center">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </motion.nav>

        {/* Bottom Slot */}
        {/* Thêm min-w-[${sidebarWidth}px] */}
        <motion.div
           className={`p-3 border-t border-slate-200 flex-shrink-0 min-w-[${sidebarWidth}px]`}
           variants={contentVariants}
           animate={collapsed ? "closed" : "open"}
           style={{ pointerEvents: collapsed ? 'none' : 'auto' }}
        >
          {bottomSlot}
        </motion.div>
      </motion.aside>

      {/* Nút Mở Sidebar (Menu) - Chỉ hiện khi collapsed */}
      <AnimatePresence>
        {collapsed && (
            <motion.button
                onClick={onToggle}
                // Đặt ở vị trí cố định, z-index cao hơn sidebar đã đóng
                className="fixed top-2.5 left-2.5 z-50 p-2 bg-white rounded-full shadow-md border border-slate-200 hover:bg-slate-100 transition-colors"
                title="Open Sidebar"
                initial={{ opacity: 0, scale: 0.8, x: -20 }} // Animation vào
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -20 }} // Animation ra
                transition={{ duration: 0.2, ease: "easeOut" }}
            >
                <Menu size={18} className="text-slate-700"/>
            </motion.button>
        )}
       </AnimatePresence>
    </>
  );
}
