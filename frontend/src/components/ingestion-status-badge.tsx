import type { IngestionStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<IngestionStatus, { label: string; className: string }> = {
  pending: {
    label: "В очереди",
    className: "bg-surface-container-high text-secondary border-border-subtle",
  },
  processing: {
    label: "Обработка",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  ready: {
    label: "Готов",
    className: "bg-status-success/10 text-status-success border-status-success/30",
  },
  failed: {
    label: "Ошибка",
    className: "bg-status-error/10 text-status-error border-status-error/30",
  },
};

export function IngestionStatusBadge({
  status,
  className,
}: {
  status: IngestionStatus;
  className?: string;
}) {
  const { label, className: statusClassName } = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
        statusClassName,
        className
      )}
    >
      {label}
    </span>
  );
}
