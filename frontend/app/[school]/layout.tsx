"use client";
import { useState, useEffect, Suspense, ReactNode } from "react";
import CollapsibleSidebar from "@/components/CollapsibleSidebar";
import StudentSidebar from "@/components/StudentSideBar"; 
import StudentAuthModal from "@/components/StudentAuthModal";
import { getAuth, AUTH_EVENT } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";

// Define Auth type
type AuthData = { token: string; role: string; email: string; school_id: number } | null;

// --- Main Layout Content Component ---
function StudentLayoutContent({ params, children }: { params: { school: string }, children: ReactNode }) {
  const { school } = params;
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false); // Sidebar state
  const [authData, setAuthData] = useState<AuthData>(null);
  const [showAuthModal, setShowAuthModal] = useState(false); // Modal state
  const [isAdmin, setIsAdmin] = useState(false); // Admin check
  const [isClient, setIsClient] = useState(false); // Mount check

  // Set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update auth state on mount and on custom auth event
  useEffect(() => {
    if (!isClient) return; // Run only client-side

    const handleAuthChange = () => {
      const currentAuth = getAuth();
      console.log("Layout: Auth changed, new data:", currentAuth);
      setAuthData(currentAuth);
      setIsAdmin(!!currentAuth && ["owner", "admin", "dept_admin"].includes(currentAuth.role));
    };

    window.addEventListener(AUTH_EVENT, handleAuthChange);
    handleAuthChange(); // Initial check

    return () => window.removeEventListener(AUTH_EVENT, handleAuthChange);
  }, [isClient]);

  // Logic to trigger auth modal for protected routes
  useEffect(() => {
     if (!isClient) return;

    const protectedRoutes = ["/apply-services", "/tracking", "/map", "/transcripts"];
    const isProtected = protectedRoutes.some(p => pathname.startsWith(`/${school}${p}`));

    if (isProtected && !authData) {
      console.log("Layout: Showing Auth Modal for protected route.");
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false); // Ensure modal is hidden if logged in or on public route
    }
  }, [pathname, authData, school, isClient]);

  // Handler for successful login/signup from modal
  const handleLoginSuccess = () => {
    // Auth state is updated via the AUTH_EVENT listener
    setShowAuthModal(false);
  };

  // Handler for closing the modal (potentially redirecting)
  const handleModalClose = () => {
     setShowAuthModal(false);
     const protectedRoutes = ["/apply-services", "/tracking", "/map", "/transcripts"];
     const isProtected = protectedRoutes.some(p => pathname.startsWith(`/${school}${p}`));
     if (isProtected && !authData) {
        // Redirect back to school home if modal closed on protected route without logging in
        router.push(`/${school}`);
     }
  }

  // Render loading state or null during server render / before client mount
  if (!isClient) {
     // You can return a more sophisticated skeleton here
     return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // --- JSX Structure ---
  return (
    <>
      {/* Main content area with dynamic margin for sidebar */}
      <div className="min-h-screen relative bg-gradient-to-br from-blue-50 to-indigo-100" // Moved background here
           style={{
             marginLeft: collapsed ? "0px" : "var(--sidebar-w, 260px)",
             transition: 'margin-left 0.3s ease-in-out'
           }}>
        
        {/* Sidebar Component */}
        <CollapsibleSidebar
          title={school.toUpperCase().replace(/-/g, ' ')}
          subtitle="Student Portal"
          // Use the correct export name from your sidebar logic file
          items={StudentSidebar.items(school, authData?.role || null)}
          bottomSlot={StudentSidebar.bottomSlot( () => setShowAuthModal(true), authData )}
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
        />

        {/* Header Bar */}
        <header className="h-14 border-b border-slate-200/80 bg-white/60 backdrop-blur sticky top-0 z-30 flex items-center px-4 justify-between">
          <div className="text-sm font-semibold text-slate-800">{school.toUpperCase().replace(/-/g, ' ')}</div>
          {isAdmin && (
            <a href={`/admin/${school}`} className="...">Admin Console</a>
          )}
        </header>

        {/* ** MAIN CONTENT AREA - NO PADDING HERE ** */}
        <main>
           {/* The Chat component or other page content will render here */}
           {children}
        </main>
      </div>

      {/* Auth Modal (Rendered outside the shifting div) */}
      <AnimatePresence>
        {showAuthModal && (
          <StudentAuthModal
            school={school}
            onClose={handleModalClose}
            onSuccess={handleLoginSuccess}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Main export wrapper with Suspense
export default function StudentLayoutWrapper({ params, children }: { params: { school: string }, children: ReactNode }) {
   return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Layout...</div>}>
         <StudentLayoutContent params={params}>
            {children}
         </StudentLayoutContent>
      </Suspense>
   );
}