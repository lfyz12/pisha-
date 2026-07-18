import { Navigate, Outlet } from "react-router";
import { PageSkeleton } from "@/components/page-skeleton";
import { useAuthStore } from "@/stores";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const nextStep = useAuthStore((s) => s.nextStep);

  if (!isInitialized) {
    return <PageSkeleton />;
  }

  if (isAuthenticated && !nextStep) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
