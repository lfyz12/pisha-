import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  OnboardingContext,
  type OnboardingState,
} from "./onboarding-context";

const STORAGE_KEY = "pisha-onboarding";

function readStored(userId: string | undefined): OnboardingState {
  if (!userId) return { dismissed: [], hidden: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissed: [], hidden: [] };
    const parsed = JSON.parse(raw) as Record<string, OnboardingState>;
    return parsed[userId] ?? { dismissed: [], hidden: [] };
  } catch {
    return { dismissed: [], hidden: [] };
  }
}

function writeStored(userId: string | undefined, state: OnboardingState) {
  if (!userId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, OnboardingState>) : {};
    parsed[userId] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage errors
  }
}

function OnboardingProviderInner({
  userId,
  children,
}: {
  userId: string | undefined;
  children: ReactNode;
}) {
  const [dismissed, setDismissed] = useState<string[]>(() => readStored(userId).dismissed);
  const [hidden, setHidden] = useState<string[]>(() => readStored(userId).hidden);

  useEffect(() => {
    writeStored(userId, { dismissed, hidden });
  }, [userId, dismissed, hidden]);

  const dismiss = useCallback((key: string) => {
    setDismissed((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setHidden((prev) => prev.filter((k) => k !== key));
  }, []);

  const hide = useCallback((key: string) => {
    setHidden((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const reset = useCallback(() => {
    setDismissed([]);
    setHidden([]);
  }, []);

  const isDismissed = useCallback(
    (key: string) => dismissed.includes(key),
    [dismissed]
  );

  const isHidden = useCallback(
    (key: string) => hidden.includes(key),
    [hidden]
  );

  const value = useMemo(
    () => ({
      dismissed,
      hidden,
      dismiss,
      hide,
      reset,
      isDismissed,
      isHidden,
    }),
    [dismissed, hidden, dismiss, hide, reset, isDismissed, isHidden]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function OnboardingProvider({
  userId,
  children,
}: {
  userId: string | undefined;
  children: ReactNode;
}) {
  return (
    <OnboardingProviderInner key={userId} userId={userId}>
      {children}
    </OnboardingProviderInner>
  );
}
