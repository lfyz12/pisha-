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

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  const adminRoutes = ["/dashboard/admin"];
  if (adminRoutes.includes(location.pathname) && currentUser?.role !== "admin") {
    return <Navigate to="/forbidden" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="p-6 space-y-6 max-w-[var(--spacing-container-max)] mx-auto w-full">
          <Outlet />
        </div>
        <Footer />
      </main>
      <AdminOnly>
        <button className="fixed bottom-6 right-6 w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-50">
          <Icon name="add" fill className="text-on-primary" />
        </button>
      </AdminOnly>
    </div>
  );
}
