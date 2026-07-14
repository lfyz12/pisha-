import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface GuideDotProps {
  fromRect: DOMRect;
  toRect: DOMRect;
  active: boolean;
  onArrived?: () => void;
}

export function GuideDot({ fromRect, toRect, active, onArrived }: GuideDotProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (active && reducedMotion) {
      onArrived?.();
    }
  }, [active, reducedMotion, onArrived]);

  if (!active) return null;

  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;
  const targetWidth = toRect.width + 12;
  const targetHeight = toRect.height + 12;

  const style: React.CSSProperties & { [key: `--${string}`]: string } = {
    left: reducedMotion ? toX : fromX,
    top: reducedMotion ? toY : fromY,
    transform: "translate(-50%, -50%)",
    width: reducedMotion ? targetWidth : 14,
    height: reducedMotion ? targetHeight : 14,
    borderRadius: reducedMotion ? "10px" : "50%",
    backgroundColor: reducedMotion ? "transparent" : "#dd5e27",
    borderStyle: "solid",
    borderColor: "#dd5e27",
    borderWidth: reducedMotion ? 3 : 0,
    boxShadow: reducedMotion
      ? "0 8px 24px rgba(221, 94, 39, 0.25)"
      : "0 2px 14px rgba(221, 94, 39, 0.6)",
    "--from-x": `${fromX}px`,
    "--from-y": `${fromY}px`,
    "--to-x": `${toX}px`,
    "--to-y": `${toY}px`,
    "--target-w": `${targetWidth}px`,
    "--target-h": `${targetHeight}px`,
  };

  if (!reducedMotion) {
    style.animation = "guide-dot-fly 1000ms cubic-bezier(0.4, 0, 0.2, 1) forwards";
  }

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={style}
      onAnimationEnd={() => onArrived?.()}
    />
  );
}
