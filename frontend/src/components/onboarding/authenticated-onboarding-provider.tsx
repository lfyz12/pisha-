import { useAuthStore } from "@/stores/use-auth-store";
import { OnboardingProvider } from "./onboarding-provider";

export function AuthenticatedOnboardingProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.currentUser?.id);
  return <OnboardingProvider userId={userId}>{children}</OnboardingProvider>;
}
