import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useGpaDistribution } from "@/hooks";
import type { GpaBarData } from "@/types";

interface BarChartSectionProps {
  mockData?: GpaBarData[];
}

export function BarChartSection({ mockData }: BarChartSectionProps) {
  const { data, isLoading, error } = useGpaDistribution();
  const bars: GpaBarData[] = mockData ?? data?.data ?? [];

  return (
    <div className="glass p-xl rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-xl">
        <h3 className="text-[--text-headline-sm] font-headline-sm">Распределение баллов</h3>
        <Icon name="more_vert" className="text-secondary" />
      </div>

      {!mockData && isLoading ? (
        <div className="flex items-end gap-[4px] h-[120px] px-md">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-full" />
          ))}
        </div>
      ) : !mockData && error ? (
        <div className="flex items-center justify-center h-[120px] text-status-error text-sm">
          Ошибка загрузки данных
        </div>
      ) : bars.length === 0 ? (
        <div className="flex items-center justify-center h-[120px] text-secondary text-sm">
          Нет данных
        </div>
      ) : (
        <div className="flex items-end gap-[4px] h-[120px] px-md">
          {bars.map((bar, i) => (
            <div
              key={i}
              className="bg-primary w-full rounded-[2px] rounded-b-none transition-all duration-500 hover:opacity-80"
              style={{ height: `${bar.value}%` }}
              title={`${bar.label}: ${bar.value}%`}
            />
          ))}
        </div>
      )}

      <div className="flex justify-between mt-[--spacing-md] text-[--text-label-md] text-secondary px-md">
        {bars.length > 0 ? (
          <>
            <span>{bars[0]?.label}</span>
            <span>{bars[Math.floor(bars.length / 3)]?.label}</span>
            <span>{bars[Math.floor((bars.length * 2) / 3)]?.label}</span>
            <span>{bars[bars.length - 1]?.label}</span>
          </>
        ) : (
          <>
            <span>2.0</span>
            <span>3.0</span>
            <span>4.0</span>
            <span>5.0</span>
          </>
        )}
      </div>
    </div>
  );
}
