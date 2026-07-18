import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { Icon } from "@/components/ui/icon";
import { AdminOnly } from "@/components/admin-only";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuthStore } from "@/stores";
export default function DashboardLayout() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  const adminRoutes = ["/dashboard/admin"];
  if (adminRoutes.includes(location.pathname) && currentUser?.role !== "admin") {
    return <Navigate to="/forbidden" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <div className="app-background" aria-hidden="true" />
      <Sidebar />

      <Sidebar isMobile isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="flex-1 p-3 sm:p-4 lg:p-6 space-y-6 max-w-[var(--spacing-container-max)] mx-auto w-full">
          <Outlet />
        </div>
        <Footer />
      </main>
      <AdminOnly>
        <button className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 glass text-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-40">
          <Icon name="add" fill className="text-primary" />
        </button>
      </AdminOnly>
    </div>
  );
}
