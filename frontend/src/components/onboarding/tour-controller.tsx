import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { GuideDot } from "./guide-dot";
import { TourBubble } from "./tour-bubble";
import type { TourStep } from "./onboarding-config";

interface TourControllerProps {
  steps: TourStep[];
  originRect: DOMRect;
  onClose: () => void;
}

export function TourController({ steps, originRect, onClose }: TourControllerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [previousTargetRect, setPreviousTargetRect] = useState<DOMRect | null>(null);
  const [dotKey, setDotKey] = useState(0);

  const step = steps[stepIndex];

  useLayoutEffect(() => {
    const measure = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else if (stepIndex < steps.length - 1) {
        setStepIndex((i) => i + 1);
      }
    };

    let rafId: number | null = null;
    const throttledMeasure = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        measure();
      });
    };

    measure();
    window.addEventListener("resize", throttledMeasure);
    window.addEventListener("scroll", throttledMeasure, true);
    return () => {
      window.removeEventListener("resize", throttledMeasure);
      window.removeEventListener("scroll", throttledMeasure, true);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [step, stepIndex, steps.length]);

  const handleArrived = useCallback(() => {
    // bubble is shown automatically once targetRect exists
  }, []);

  const handleNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      onClose();
      return;
    }
    setPreviousTargetRect(targetRect);
    setStepIndex((i) => i + 1);
    setDotKey((k) => k + 1);
  }, [stepIndex, steps.length, onClose, targetRect]);

  const fromRect = useMemo(
    () => (stepIndex === 0 ? originRect : (previousTargetRect ?? targetRect ?? originRect)),
    [stepIndex, originRect, previousTargetRect, targetRect]
  );

  const bubbleRect = targetRect ?? originRect;
  const bubbleStyle: React.CSSProperties = {
    left: bubbleRect.left + bubbleRect.width + 16,
    top: bubbleRect.top,
  };

  // keep bubble on screen if it overflows right
  if (bubbleRect.left + bubbleRect.width + 16 + 256 > window.innerWidth) {
    bubbleStyle.left = bubbleRect.left - 16 - 256;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!step || !targetRect) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 z-40 pointer-events-none" />
      <GuideDot
        key={dotKey}
        fromRect={fromRect}
        toRect={targetRect}
        active
        onArrived={handleArrived}
      />
      <div className="fixed z-50" style={bubbleStyle}>
        <TourBubble
          title={step.title}
          text={step.text}
          step={stepIndex + 1}
          total={steps.length}
          onNext={handleNext}
          onSkip={onClose}
        />
      </div>
    </>
  );
}
