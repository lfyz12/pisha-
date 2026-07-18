import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const nextStep = useAuthStore((s) => s.nextStep);

  if (isAuthenticated && !nextStep) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
