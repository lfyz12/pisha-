import { createContext } from "react";

export type OnboardingState = {
  dismissed: string[];
  hidden: string[];
};

export type OnboardingContextValue = {
  dismissed: string[];
  hidden: string[];
  dismiss: (key: string) => void;
  hide: (key: string) => void;
  reset: () => void;
  isDismissed: (key: string) => boolean;
  isHidden: (key: string) => boolean;
};

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);
