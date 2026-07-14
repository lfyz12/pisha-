import { useIsAdmin } from "@/hooks/use-is-admin";

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const isAdmin = useIsAdmin();
  return isAdmin ? <>{children}</> : <>{fallback}</>;
}

export function StudentOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isAdmin = useIsAdmin();
  return !isAdmin ? <>{children}</> : <>{fallback}</>;
}
