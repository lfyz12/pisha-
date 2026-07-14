import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnchorWord } from "./anchor-word";
import { SpotlightOverlay } from "./spotlight-overlay";
import type { Hint } from "./onboarding-config";

interface ContextualHintProps {
  hint: Hint;
  onDismiss: () => void;
  onHide: () => void;
}

export function ContextualHint({ hint, onDismiss, onHide }: ContextualHintProps) {
  const [activeTarget, setActiveTarget] = useState<string | null>(null);

  return (
    <>
      <SpotlightOverlay targetId={activeTarget} visible={!!activeTarget} />
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-80 rounded-lg border border-border",
          "bg-card p-4 shadow-lg border-l-4 border-l-primary"
        )}
        role="status"
        aria-live="polite"
      >
        <h4 className="font-semibold text-sm mb-2">{hint.title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {splitText(hint.text, hint.anchors).map((part, i) =>
            part.type === "anchor" ? (
              <AnchorWord
                key={i}
                word={part.word}
                targetId={part.targetId}
                active={activeTarget === part.targetId}
                onActivate={setActiveTarget}
              />
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </p>
        <div className="flex justify-between items-center mt-4">
          <button
            type="button"
            onClick={onHide}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Скрыть
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md"
          >
            Понятно
          </button>
        </div>
      </div>
    </>
  );
}

type Part =
  | { type: "text"; text: string }
  | { type: "anchor"; word: string; targetId: string };

function splitText(text: string, anchors: { word: string; targetId: string }[]): Part[] {
  const parts: Part[] = [];
  let remaining = text;
  anchors.forEach((anchor) => {
    const index = remaining.indexOf(anchor.word);
    if (index === -1) return;
    if (index > 0) parts.push({ type: "text", text: remaining.slice(0, index) });
    parts.push({ type: "anchor", word: anchor.word, targetId: anchor.targetId });
    remaining = remaining.slice(index + anchor.word.length);
  });
  if (remaining) parts.push({ type: "text", text: remaining });
  return parts;
}
