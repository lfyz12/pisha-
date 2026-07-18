import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  label: string;
  value: string | undefined;
  icon: string;
  trend?: { value: string; positive: boolean };
  progress?: { value: number; max: number };
  secondary?: string;
  iconFill?: boolean;
  isLoading?: boolean;
  error?: boolean;
}

export function MetricCard({
  label,
  value,
  icon,
  trend,
  progress,
  secondary,
  iconFill = false,
  isLoading = false,
  error = false,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-lg rounded-lg border flex flex-col justify-between min-h-[140px] overflow-hidden">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20 mt-sm" />
        <Skeleton className="h-6 w-6 mt-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-lg rounded-lg border flex flex-col justify-between min-h-[140px] overflow-hidden">
        <span className="text-[--text-label-md] font-label-md text-secondary uppercase block leading-tight">
          {label}
        </span>
        <span className="text-[--text-body-sm] text-status-error mt-sm">Ошибка загрузки</span>
        <Icon name="error" className="text-status-error mt-auto" />
      </div>
    );
  }

  return (
    <div className="glass-card p-lg rounded-lg border hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between min-h-[140px] overflow-hidden transition-all duration-200">
      <span className="text-[--text-label-md] font-label-md text-secondary uppercase block leading-tight">
        {label}
      </span>
      <div className="flex items-baseline space-x-[--spacing-xs] mt-[--spacing-sm]">
        <span className="text-[--text-headline-lg] font-headline-lg">{value ?? "—"}</span>
        {trend && (
          <span
            className={`text-[--text-label-md] font-bold ${
              trend.positive ? "text-status-success" : "text-status-error"
            }`}
          >
            {trend.value}
          </span>
        )}
        {secondary && <span className="text-[--text-label-md] text-secondary">{secondary}</span>}
      </div>
      {progress && (
        <div className="w-full bg-surface-container-high h-1 mt-[--spacing-md] rounded-full overflow-hidden">
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${(progress.value / progress.max) * 100}%` }}
          />
        </div>
      )}
      <Icon name={icon} fill={iconFill} className="text-primary mt-auto" />
    </div>
  );
}
