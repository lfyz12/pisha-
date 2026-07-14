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
      >
        <h4 className="font-semibold text-sm mb-2">{hint.title}</h4>
        <p
          className="text-sm text-muted-foreground leading-relaxed"
          role="status"
          aria-live="polite"
        >
          {splitText(hint.text, hint.anchors).map((part, i) =>
            part.type === "anchor" ? (
              <AnchorWord
                key={`anchor-${part.targetId}-${i}`}
                word={part.word}
                targetId={part.targetId}
                active={activeTarget === part.targetId}
                onActivate={setActiveTarget}
              />
            ) : (
              <span key={`text-${i}-${part.text.slice(0, 8)}`}>{part.text}</span>
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

type Part = { type: "text"; text: string } | { type: "anchor"; word: string; targetId: string };

function splitText(text: string, anchors: { word: string; targetId: string }[]): Part[] {
  const parts: Part[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliest: { index: number; anchor: { word: string; targetId: string } } | null = null;
    for (const anchor of anchors) {
      const index = remaining.indexOf(anchor.word);
      if (index !== -1 && (earliest === null || index < earliest.index)) {
        earliest = { index, anchor };
      }
    }

    if (!earliest) {
      parts.push({ type: "text", text: remaining });
      break;
    }

    if (earliest.index > 0) {
      parts.push({ type: "text", text: remaining.slice(0, earliest.index) });
    }
    parts.push({
      type: "anchor",
      word: earliest.anchor.word,
      targetId: earliest.anchor.targetId,
    });
    remaining = remaining.slice(earliest.index + earliest.anchor.word.length);
  }

  return parts;
}
