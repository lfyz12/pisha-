import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  fill?: boolean;
  weight?: number;
  className?: string;
}

export function Icon({ name, fill = false, weight = 400, className }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined", className)}
      style={{
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
      }}
      aria-hidden
    >
      {name}
    </span>
  );
}
