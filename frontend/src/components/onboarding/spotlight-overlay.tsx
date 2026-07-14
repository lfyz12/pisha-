import { useEffect, useState } from "react";

interface SpotlightOverlayProps {
  targetId: string | null;
  visible: boolean;
}

export function SpotlightOverlay({ targetId, visible }: SpotlightOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetId || !visible) {
      setRect(null);
      return;
    }
    const el = document.getElementById(targetId);
    if (!el) return;
    setRect(el.getBoundingClientRect());

    const handleResize = () => {
      const next = document.getElementById(targetId);
      if (next) setRect(next.getBoundingClientRect());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [targetId, visible]);

  if (!visible || !rect) return null;

  const padding = 6;
  const left = rect.left + window.scrollX - padding;
  const top = rect.top + window.scrollY - padding;
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        className="absolute inset-0 bg-slate-900/20 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        className="absolute rounded-lg animate-tremor"
        style={{
          left,
          top,
          width,
          height,
          boxShadow:
            "0 0 0 9999px rgba(15, 23, 42, 0.22), 0 0 0 3px #dd5e27, 0 8px 24px rgba(221, 94, 39, 0.25)",
          animation: "tremor 0.35s ease-in-out",
        }}
      />
    </div>
  );
}
