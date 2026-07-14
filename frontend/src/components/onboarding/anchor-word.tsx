import { cn } from "@/lib/utils";

interface AnchorWordProps {
  word: string;
  targetId: string;
  active: boolean;
  onActivate: (targetId: string | null) => void;
}

export function AnchorWord({ word, targetId, active, onActivate }: AnchorWordProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline font-semibold text-primary border-b border-dashed border-primary cursor-pointer",
        "bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded",
        active && "bg-primary text-primary-foreground rounded px-0.5"
      )}
      onMouseEnter={() => onActivate(targetId)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(targetId)}
      onBlur={() => onActivate(null)}
      onClick={() => onActivate(active ? null : targetId)}
      aria-pressed={active}
    >
      {word}
    </button>
  );
}
