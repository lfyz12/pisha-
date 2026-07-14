import { useCallback, useContext, useMemo } from "react";
import { OnboardingContext } from "./onboarding-provider";

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
