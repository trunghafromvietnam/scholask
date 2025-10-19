import { BarChart2, Database, Ticket, Users, Settings, LogOut, Link } from "lucide-react";
import { clearAuth } from "@/lib/auth";

const getItems = (school: string) => [
    { name: "Dashboard", href: `/admin/${school}`, icon: <BarChart2 size={18} /> },
    { name: "Knowledge", href: `/admin/${school}/knowledge`, icon: <Database size={18} /> },
    { name: "Tickets", href: `/admin/${school}/tickets`, icon: <Ticket size={18} /> },
    { name: "Users", href: `/admin/${school}/users`, icon: <Users size={18} /> },
    { name: "Settings", href: `/admin/${school}/settings`, icon: <Settings size={18} /> },
];

const bottomSlotContent = (school: string): React.ReactNode => {
   const handleLogout = async () => { 
        console.log("Admin logout initiated...");
        try {
          await clearAuth(); 
          window.location.href = '/admin/login'; 
        } catch (error) {
          console.error("Logout failed:", error);
        }
    };
   return (
       <button onClick={handleLogout} className="...">
         <LogOut size={18} />
         <span>Sign Out</span>
       </button>
   );
};

const AdminSidebar = {
  items: getItems,
  bottomSlot: bottomSlotContent,
};

export default AdminSidebar;
