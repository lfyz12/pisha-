import { AdminOnly } from "@/components/admin-only";
import { useDashboardMetrics } from "@/hooks";
import { useMockDataStore } from "@/stores";
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
  const mockStore = useMockDataStore();
  const hasMockData = mockStore.parsedData !== null;

  const mockMetrics = hasMockData ? mockStore.getMetrics() : undefined;
  const mockGpa = hasMockData ? mockStore.getGpaDistribution() : undefined;
  const mockAttendance = hasMockData ? mockStore.getAttendanceTrends() : undefined;

  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
  } = useDashboardMetrics();
  const m = hasMockData ? mockMetrics : metricsData?.data;

  return (
    <div className="space-y-xl">
      {mockStore.parsedData && (
        <div className="bg-primary-fixed/20 border border-primary/30 text-primary text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          Данные из Excel: {mockStore.parsedData.students.length} студентов ({mockStore.fileName})
        </div>
      )}

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
          label="Средний балл"
          value={metricsLoading && !hasMockData ? undefined : formatNumber(m?.averageGpa)}
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
    </div>
  );
}
