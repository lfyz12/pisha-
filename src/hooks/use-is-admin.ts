import { useAuthStore } from "@/stores";

export function useIsAdmin() {
  const currentUser = useAuthStore((s) => s.currentUser);
  return currentUser?.role === "admin";
}
