import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Hint, Tour } from "./onboarding-config";

interface HintReopenButtonProps {
  hints: Hint[];
  tours: Tour[];
  onShowHint: (pageKey: string) => void;
  onStartTour: (tourKey: string) => void;
  hasHidden: boolean;
}

export function HintReopenButton({
  hints,
  tours,
  onShowHint,
  onStartTour,
  hasHidden,
}: HintReopenButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!hasHidden && hints.length === 0 && tours.length === 0) return null;

  return (
    <div ref={ref} className="fixed bottom-6 left-6 z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-11 h-11 rounded-full bg-card border border-border shadow-md",
          "flex items-center justify-center text-primary hover:bg-accent transition-colors"
        )}
        aria-label="Показать подсказки"
      >
        <Icon name="help" />
      </button>
      {open && (
        <div className="absolute bottom-14 left-0 w-56 rounded-lg border border-border bg-card shadow-lg p-2">
          {hints.length > 0 && (
            <>
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide">
                Подсказки
              </div>
              {hints.map((h) => (
                <button
                  key={h.pageKey}
                  type="button"
                  onClick={() => {
                    onShowHint(h.pageKey);
                    setOpen(false);
                  }}
                  className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent"
                >
                  {h.title}
                </button>
              ))}
            </>
          )}
          {tours.length > 0 && (
            <>
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide border-t border-border mt-1 pt-1">
                Туры
              </div>
              {tours.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    onStartTour(t.key);
                    setOpen(false);
                  }}
                  className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent"
                >
                  {t.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
