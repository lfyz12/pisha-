import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GuideDot } from "./guide-dot";
import { TourBubble } from "./tour-bubble";
import type { TourStep } from "./onboarding-config";

const BUBBLE_WIDTH = 256;
const BUBBLE_GAP = 16;

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
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  const step = steps[stepIndex];

  // Hold the latest originRect in a ref so a new DOMRect object from the parent
  // does not restart the layout effect or recompute derived rects.
  const originRectRef = useRef(originRect);
  // eslint-disable-next-line react-hooks/refs
  originRectRef.current = originRect;

  // Find the target for the current step and advance only when the step changes.
  useLayoutEffect(() => {
    const el = document.getElementById(step.targetId);
    if (el) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetRect(el.getBoundingClientRect());
      return;
    }
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setTargetRect(originRectRef.current);
    }
    // originRect is intentionally omitted: it is read from originRectRef to avoid
    // re-running when the parent passes a new DOMRect object each render.
  }, [step.targetId, stepIndex, steps.length]);

  // Re-measure the existing target on scroll/resize without skipping steps.
  useEffect(() => {
    if (!targetRect) return;

    const targetId = step.targetId;
    const remeasure = () => {
      const el = document.getElementById(targetId);
      if (el) setTargetRect(el.getBoundingClientRect());
    };

    let rafId: number | null = null;
    const handler = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        remeasure();
      });
    };

    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [step.targetId, targetRect]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  /* eslint-disable react-hooks/refs */
  const fromRect = useMemo(
    () =>
      stepIndex === 0
        ? originRectRef.current
        : (previousTargetRect ?? targetRect ?? originRectRef.current),
    // originRect is read from the ref to avoid recomputing on every parent render.
    [stepIndex, previousTargetRect, targetRect]
  );
  /* eslint-enable react-hooks/refs */

  // eslint-disable-next-line react-hooks/refs
  const bubbleRect = targetRect ?? originRectRef.current;
  const bubbleStyle: React.CSSProperties = useMemo(() => {
    const style: React.CSSProperties = {
      left: bubbleRect.left + bubbleRect.width + BUBBLE_GAP,
      top: bubbleRect.top,
    };

    // keep bubble on screen if it overflows right
    if (bubbleRect.left + bubbleRect.width + BUBBLE_GAP + BUBBLE_WIDTH > viewportWidth) {
      style.left = bubbleRect.left - BUBBLE_GAP - BUBBLE_WIDTH;
    }

    return style;
  }, [bubbleRect, viewportWidth]);

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
      <GuideDot key={dotKey} fromRect={fromRect} toRect={targetRect} active />
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
