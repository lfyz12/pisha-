import { Skeleton } from "@/components/ui/skeleton";
import { useAttendanceTrends } from "@/hooks";
import type { AttendanceTrend } from "@/types";

interface LineChartSectionProps {
  id?: string;
  mockData?: AttendanceTrend[];
}

export function LineChartSection({ id, mockData }: LineChartSectionProps) {
  const { data, isLoading, error } = useAttendanceTrends();
  const trends: AttendanceTrend[] = mockData ?? data?.data ?? [];

  return (
    <div id={id} className="bg-surface-card p-xl rounded-lg border border-border-subtle shadow-sm">
      <div className="flex justify-between items-center mb-xl">
        <h3 className="text-[--text-headline-sm] font-headline-sm">Тренды посещаемости</h3>
        <div className="flex space-x-sm">
          <span className="flex items-center text-[--text-label-md] text-secondary">
            <span className="w-3 h-3 bg-primary rounded-full mr-[--spacing-xs]" />
            Поток 2024
          </span>
        </div>
      </div>

      {!mockData && isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !mockData && error ? (
        <div className="flex items-center justify-center h-32 text-status-error text-sm">
          Ошибка загрузки данных
        </div>
      ) : trends.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-secondary text-sm">
          Нет данных
        </div>
      ) : (
        <>
          <div className="h-32 relative flex items-end">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 100">
              <path className="stroke-primary stroke-2 fill-none" d={generateSmoothPath(trends)} />
              <path
                d={`${generateSmoothPath(trends)} L400,100 L0,100 Z`}
                fill="rgba(221, 94, 39, 0.05)"
              />
            </svg>
          </div>
          <div className="flex justify-between mt-[--spacing-md] text-[--text-label-md] text-secondary">
            {trends.map((t) => (
              <span key={t.month}>{t.month}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function generateSmoothPath(data: { value: number }[]): string {
  if (data.length === 0) return "";
  const step = 400 / (data.length - 1);
  return data
    .map((point, i) => {
      const x = i * step;
      const y = 100 - point.value;
      if (i === 0) return `M${x},${y}`;
      const prevX = (i - 1) * step;
      const prevY = 100 - data[i - 1].value;
      const cpX = (prevX + x) / 2;
      return `Q${cpX},${prevY} ${x},${y}`;
    })
    .join(" ");
}
