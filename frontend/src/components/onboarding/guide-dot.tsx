import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface GuideDotProps {
  fromRect: DOMRect;
  toRect: DOMRect;
  active: boolean;
  onArrived: () => void;
}

export function GuideDot({ fromRect, toRect, active, onArrived }: GuideDotProps) {
  const [phase, setPhase] = useState<"flying" | "morphing" | "arrived" | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!active) {
      setPhase(null);
      return;
    }
    if (reducedMotion) {
      setPhase("arrived");
      onArrived();
      return;
    }
    setPhase("flying");
    /* eslint-enable react-hooks/set-state-in-effect */
    const flyTimer = setTimeout(() => setPhase("morphing"), 700);
    const arriveTimer = setTimeout(() => {
      setPhase("arrived");
      onArrived();
    }, 1000);
    return () => {
      clearTimeout(flyTimer);
      clearTimeout(arriveTimer);
    };
  }, [active, onArrived, reducedMotion]);

  if (!active || !phase) return null;

  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;
  const targetWidth = toRect.width + 12;
  const targetHeight = toRect.height + 12;

  const isMorphing = phase === "morphing" || phase === "arrived";

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: isMorphing ? toX : fromX,
        top: isMorphing ? toY : fromY,
        transform: "translate(-50%, -50%)",
        transition: "all 700ms cubic-bezier(0.4, 0, 0.2, 1)",
        width: isMorphing ? targetWidth : 14,
        height: isMorphing ? targetHeight : 14,
        borderRadius: isMorphing ? 10 : "50%",
        backgroundColor: isMorphing ? "transparent" : "#dd5e27",
        border: isMorphing ? "3px solid #dd5e27" : "0px solid #dd5e27",
        boxShadow: isMorphing
          ? "0 8px 24px rgba(221, 94, 39, 0.25)"
          : "0 2px 14px rgba(221, 94, 39, 0.6)",
      }}
    />
  );
}
