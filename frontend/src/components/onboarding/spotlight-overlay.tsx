import { useLayoutEffect, useState, useSyncExternalStore } from "react";

function useReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

interface SpotlightOverlayProps {
  targetId: string | null;
  visible: boolean;
}

export function SpotlightOverlay({ targetId, visible }: SpotlightOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (!targetId || !visible) return;
    const measure = () => {
      const el = document.getElementById(targetId);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [targetId, visible]);

  if (!visible || !rect) return null;

  const padding = 6;
  const left = rect.left - padding;
  const top = rect.top - padding;
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-slate-900/20" style={{ opacity: 1 }} />
      <div
        className="absolute rounded-lg"
        style={{
          left,
          top,
          width,
          height,
          boxShadow:
            "0 0 0 9999px rgba(15, 23, 42, 0.22), 0 0 0 3px #dd5e27, 0 8px 24px rgba(221, 94, 39, 0.25)",
          animation: reducedMotion ? undefined : "tremor 0.35s ease-in-out",
        }}
      />
    </div>
  );
}
