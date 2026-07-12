import { AdminOnly } from "@/components/admin-only";
import { useDashboardMetrics } from "@/hooks";
import { formatNumber } from "@/lib/utils";
import {
  MetricCard,
  BarChartSection,
  LineChartSection,
  StudentTableSection,
  ScoringFormSection,
  ServerMonitoringSection,
  AILogicBuilderSection,
} from "./components";

export default function DashboardPage() {
  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
  } = useDashboardMetrics();
  const m = metricsData?.data;

  return (
    <div className="space-y-xl">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-lg">
        <MetricCard
          label="Всего студентов"
          value={metricsLoading ? undefined : m?.totalStudents?.toString()}
          trend={
            m
              ? { value: `+${m.totalStudentsChange}%`, positive: m.totalStudentsChange >= 0 }
              : undefined
          }
          icon="groups"
          isLoading={metricsLoading}
          error={!!metricsError}
        />
        <MetricCard
          label="Средний балл"
          value={metricsLoading ? undefined : formatNumber(m?.averageGpa)}
          secondary="/ 5.0"
          progress={m ? { value: (m.averageGpa / 5) * 100, max: 100 } : undefined}
          icon="star"
          isLoading={metricsLoading}
          error={!!metricsError}
        />
        <MetricCard
          label="Посещаемость"
          value={metricsLoading ? undefined : `${m?.attendance ?? "—"}%`}
          icon="event_available"
          isLoading={metricsLoading}
          error={!!metricsError}
        />
        <MetricCard
          label="Проектов"
          value={metricsLoading ? undefined : m?.projects?.toString()}
          icon="folder_managed"
          isLoading={metricsLoading}
          error={!!metricsError}
        />
        <MetricCard
          label="Новых заявок"
          value={metricsLoading ? undefined : m?.newRequests?.toString()}
          icon="notifications_active"
          iconFill
          isLoading={metricsLoading}
          error={!!metricsError}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <BarChartSection />
        <LineChartSection />
      </section>

      <AdminOnly>
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
          <StudentTableSection />
          <ScoringFormSection />
        </section>
      </AdminOnly>

      <AdminOnly>
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          <ServerMonitoringSection />
          <AILogicBuilderSection />
        </section>
      </AdminOnly>
    </div>
  );
}
