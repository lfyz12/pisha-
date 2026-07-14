interface TourBubbleProps {
  title: string;
  text: string;
  step: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TourBubble({ title, text, step, total, onNext, onSkip }: TourBubbleProps) {
  return (
    <div
      className="fixed z-50 w-64 rounded-lg border border-border bg-card p-4 shadow-lg border-l-4 border-l-primary"
      role="dialog"
      aria-modal="false"
    >
      <div className="text-xs text-muted-foreground mb-1">
        Шаг {step} из {total}
      </div>
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{text}</p>
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Пропустить
        </button>
        <button
          type="button"
          onClick={onNext}
          className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md"
          autoFocus
        >
          Далее
        </button>
      </div>
    </div>
  );
}
