import { Icon } from "@/components/ui/icon";
import { AdminOnly } from "@/components/admin-only";
import { useDashboardMetrics } from "@/hooks";
import { useMockDataStore } from "@/stores";
import {
  MetricCard,
  BarChartSection,
  LineChartSection,
  StudentTableSection,
  ScoringFormSection,
  ServerMonitoringSection,
  AILogicBuilderSection,
} from "./components";

export default function AnalyticsPage() {
  const mockStore = useMockDataStore();
  const hasMockData = mockStore.parsedData !== null;

  const mockMetrics = hasMockData ? mockStore.getMetrics() : undefined;
  const mockGpa = hasMockData ? mockStore.getGpaDistribution() : undefined;
  const mockAttendance = hasMockData ? mockStore.getAttendanceTrends() : undefined;

  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useDashboardMetrics();
  const m = hasMockData ? mockMetrics : metricsData?.data;

  return (
    <div className="space-y-xl">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-lg">
        <MetricCard
          label="Всего студентов"
          value={metricsLoading && !hasMockData ? undefined : m?.totalStudents?.toString()}
          trend={
            m
              ? { value: `+${m.totalStudentsChange}%`, positive: m.totalStudentsChange >= 0 }
              : undefined
          }
          icon="groups"
          isLoading={metricsLoading && !hasMockData}
          error={!!metricsError && !hasMockData}
        />
        <MetricCard
          label="Средний GPA"
          value={metricsLoading && !hasMockData ? undefined : m?.averageGpa?.toFixed(2)}
          secondary="/ 5.0"
          progress={m ? { value: (m.averageGpa / 5) * 100, max: 100 } : undefined}
          icon="star"
          isLoading={metricsLoading && !hasMockData}
          error={!!metricsError && !hasMockData}
        />
        <MetricCard
          label="Посещаемость"
          value={metricsLoading && !hasMockData ? undefined : `${m?.attendance ?? "—"}%`}
          icon="event_available"
          isLoading={metricsLoading && !hasMockData}
          error={!!metricsError && !hasMockData}
        />
        <MetricCard
          label="Проектов"
          value={metricsLoading && !hasMockData ? undefined : m?.projects?.toString()}
          icon="folder_managed"
          isLoading={metricsLoading && !hasMockData}
          error={!!metricsError && !hasMockData}
        />
        <MetricCard
          label="Новых заявок"
          value={metricsLoading && !hasMockData ? undefined : m?.newRequests?.toString()}
          icon="notifications_active"
          iconFill
          isLoading={metricsLoading && !hasMockData}
          error={!!metricsError && !hasMockData}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <BarChartSection mockData={mockGpa} />
        <LineChartSection mockData={mockAttendance} />
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

      {!hasMockData && (
        <div className="text-center py-8 text-secondary text-sm flex flex-col items-center gap-2">
          <Icon name="info" className="text-xl" />
          <span>Загрузите Excel на странице рейтинга для просмотра аналитики</span>
        </div>
      )}
    </div>
  );
}
