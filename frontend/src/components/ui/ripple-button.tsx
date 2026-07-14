import { forwardRef, useRef, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

export interface RippleButtonProps extends ButtonProps {
  rippleColor?: "white" | "black";
}

export const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
  function RippleButton(
    {
      className,
      onPointerDown,
      rippleColor = "white",
      children,
      ...props
    },
    forwardedRef
  ) {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const setRefs = (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
      if (reducedMotion) {
        onPointerDown?.(event);
        return;
      }

      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      const span = document.createElement("span");
      span.className = "pointer-events-none absolute rounded-full";
      span.style.width = `${size}px`;
      span.style.height = `${size}px`;
      span.style.left = `${x - size / 2}px`;
      span.style.top = `${y - size / 2}px`;
      span.style.backgroundColor =
        rippleColor === "white"
          ? "rgba(255,255,255,0.25)"
          : "rgba(0,0,0,0.1)";
      span.style.animation =
        "ripple-grow 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards";

      button.appendChild(span);
      const cleanup = () => span.remove();
      span.addEventListener("animationend", cleanup, { once: true });

      onPointerDown?.(event);
    };

    return (
      <Button
        ref={setRefs}
        className={cn("relative overflow-hidden", className)}
        onPointerDown={handlePointerDown}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

RippleButton.displayName = "RippleButton";
