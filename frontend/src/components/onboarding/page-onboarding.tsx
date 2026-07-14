import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useAuthStore } from "@/stores/use-auth-store";
import { useOnboarding } from "./use-onboarding";
import { ContextualHint } from "./contextual-hint";
import { HintReopenButton } from "./hint-reopen-button";
import { TourController } from "./tour-controller";
import { appTourSteps, getHintsByRole, type Hint, type Tour } from "./onboarding-config";

const DEFAULT_ORIGIN_RECT = new DOMRect(40, window.innerHeight - 40, 0, 0);

export function PageOnboarding() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const role = currentUser?.role === "admin" ? "admin" : "student";
  const { pathname } = useLocation();
  const { dismiss, hide, isDismissed, isHidden } = useOnboarding();

  const pageKey = pathname.split("/").pop() ?? "";
  const hints = useMemo(() => getHintsByRole(role), [role]);
  const currentHint = useMemo(() => hints.find((h) => h.pageKey === pageKey), [hints, pageKey]);

  const [forcedHint, setForcedHint] = useState<Hint | null>(null);
  const [activeTour, setActiveTour] = useState<"page" | "app" | null>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);

  // Delay showing the hint with a 400 ms timer after pathname changes (hide first, then show).
  const [delayedPageKey, setDelayedPageKey] = useState<string>(pageKey);
  useEffect(() => {
    // Clear any forced hint immediately when the page changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForcedHint(null);
    const timer = setTimeout(() => {
      setDelayedPageKey(pageKey);
    }, 400);
    return () => clearTimeout(timer);
  }, [pageKey]);

  const visibleHint = useMemo(() => {
    if (forcedHint) return forcedHint;
    if (
      currentHint &&
      delayedPageKey === pageKey &&
      !isDismissed(currentHint.pageKey) &&
      !isHidden(currentHint.pageKey)
    ) {
      return currentHint;
    }
    return null;
  }, [forcedHint, currentHint, delayedPageKey, pageKey, isDismissed, isHidden]);

  const tours = useMemo<Tour[]>(() => {
    const list: Tour[] = [{ key: "app", label: "Тур по приложению", steps: appTourSteps[role] }];
    if (currentHint?.anchors.length) {
      list.push({
        key: "page",
        label: "Тур по странице",
        steps: currentHint.anchors.map((a, i) => ({
          targetId: a.targetId,
          title: currentHint.title,
          text: `${i + 1}-й элемент на этой странице.`,
        })),
      });
    }
    return list;
  }, [role, currentHint]);

  const tourSteps = useMemo(() => {
    if (!activeTour) return [];
    return tours.find((t) => t.key === activeTour)?.steps ?? [];
  }, [activeTour, tours]);

  const [originRect, setOriginRect] = useState<DOMRect>(DEFAULT_ORIGIN_RECT);
  useLayoutEffect(() => {
    setOriginRect(reopenRef.current?.getBoundingClientRect() ?? DEFAULT_ORIGIN_RECT);
  }, [activeTour]);

  return (
    <>
      {visibleHint && (
        <ContextualHint
          hint={visibleHint}
          onDismiss={() => {
            dismiss(visibleHint.pageKey);
            setForcedHint(null);
          }}
          onHide={() => {
            hide(visibleHint.pageKey);
            setForcedHint(null);
          }}
        />
      )}
      <HintReopenButton
        ref={reopenRef}
        hints={hints}
        tours={tours}
        onShowHint={(pageKey) => {
          const hint = hints.find((h) => h.pageKey === pageKey) ?? null;
          setForcedHint(hint);
        }}
        onStartTour={(key) => setActiveTour(key as "page" | "app")}
        hasHidden={hints.some((h) => isHidden(h.pageKey))}
      />
      {activeTour && (
        <TourController
          steps={tourSteps}
          originRect={originRect}
          onClose={() => setActiveTour(null)}
        />
      )}
    </>
  );
}
