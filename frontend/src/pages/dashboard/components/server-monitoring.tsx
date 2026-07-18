import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerMetrics } from "@/hooks";
import type { ServerMetrics } from "@/types";

export function ServerMonitoringSection() {
  const { data, isLoading, error } = useServerMetrics();
  const metrics: ServerMetrics | undefined = data?.data;

  const metricsList = metrics
    ? [
        { label: "CPU Load", value: metrics.cpuLoad, color: "bg-primary" },
        { label: "RAM Usage", value: metrics.ramUsage, color: "bg-status-error" },
        { label: "GPU (Tesla A100)", value: metrics.gpuUsage, color: "bg-status-success" },
      ]
    : [];

  return (
    <div className="glass-card p-xl rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-xl">
        <h3 className="text-[--text-headline-sm] font-headline-sm flex items-center space-x-sm">
          <Icon name="dns" className="text-primary" />
          <span>Мониторинг серверов</span>
        </h3>
        {isLoading ? (
          <Skeleton className="h-6 w-16 rounded" />
        ) : error ? (
          <span className="text-status-error text-xs font-bold">ERROR</span>
        ) : (
          <span
            className={`text-status-success bg-status-success/10 px-sm py-xs rounded text-xs font-bold border border-status-success/20`}
          >
            {metrics?.status?.toUpperCase() ?? "UNKNOWN"}
          </span>
        )}
      </div>

      <div className="space-y-lg">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="flex justify-between mb-[--spacing-xs]">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))
        ) : error ? (
          <div className="text-status-error text-sm">Ошибка загрузки данных</div>
        ) : (
          metricsList.map((metric) => (
            <div key={metric.label}>
              <div className="flex justify-between text-[--text-label-md] mb-[--spacing-xs]">
                <span className="text-secondary uppercase">{metric.label}</span>
                <span className="font-bold">{metric.value}%</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div
                  className={`${metric.color} h-full rounded-full transition-all duration-500`}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {!isLoading && !error && (
        <div className="mt-xl flex items-center text-[--text-label-md] text-secondary italic">
          <Icon name="location_on" className="text-sm mr-[--spacing-xs]" />
          <span>Размещение: {metrics?.location ?? "—"}</span>
        </div>
      )}
    </div>
  );
}
