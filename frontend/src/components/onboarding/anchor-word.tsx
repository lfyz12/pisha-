import { cn } from "@/lib/utils";

interface AnchorWordProps {
  word: string;
  targetId: string;
  active: boolean;
  onActivate: (targetId: string | null) => void;
}

export function AnchorWord({ word, targetId, active, onActivate }: AnchorWordProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        "font-semibold text-primary border-b border-dashed border-primary cursor-pointer",
        active && "text-primary-foreground"
      )}
      onMouseEnter={() => onActivate(targetId)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(targetId)}
      onBlur={() => onActivate(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(targetId);
        }
      }}
    >
      {word}
    </span>
  );
}
