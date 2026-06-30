import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { AdminOnly } from "@/components/admin-only";
import { useDashboardMetrics } from "@/hooks";
import { useAuthStore, useMockDataStore } from "@/stores";
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

export default function AnalyticsPage() {
  const mockStore = useMockDataStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const hasMockData = mockStore.parsedData !== null;
  const isStudent = currentUser?.role === "student";

  const mockMetrics = hasMockData ? mockStore.getMetrics() : undefined;
  const mockGpa = hasMockData ? mockStore.getGpaDistribution() : undefined;
  const mockAttendance = hasMockData ? mockStore.getAttendanceTrends() : undefined;

  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
  } = useDashboardMetrics();
  const m = hasMockData ? mockMetrics : metricsData?.data;

  const allStudents = hasMockData ? mockStore.getRatingStudents() : [];
  const rawStudents = mockStore.parsedData?.students ?? [];

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    isStudent ? (allStudents.find((s) => s.isCurrentUser)?.id ?? null) : null
  );

  const selectedStudent = selectedStudentId
    ? allStudents.find((s) => s.id === selectedStudentId)
    : allStudents.find((s) => s.isCurrentUser);

  const selectedRaw = selectedStudent
    ? rawStudents.find((s) => s.fullName === selectedStudent.name)
    : null;

  const attendPct = selectedRaw
    ? Math.min(
        100,
        Math.round(
          (selectedRaw.attendance.reduce((a, b) => a + b, 0) /
            Math.max(selectedRaw.attendance.length, 1)) *
            100
        )
      )
    : undefined;

  return (
    <div className="space-y-xl">
      {isStudent ? (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
            <MetricCard
              label="Мой рейтинг"
              value={formatNumber(selectedStudent?.totalScore)}
              icon="star"
              trend={
                selectedStudent
                  ? {
                      value: `#${selectedStudent.rank}`,
                      positive: selectedStudent.rank <= allStudents.length * 0.3,
                    }
                  : undefined
              }
            />
            <MetricCard
              label="Успеваемость"
              value={formatNumber(selectedStudent?.academicScore)}
              secondary="/ 5.0"
              icon="school"
              progress={
                selectedStudent ? { value: selectedStudent.academicScore, max: 5 } : undefined
              }
            />
            <MetricCard
              label="Посещаемость"
              value={attendPct != null ? `${attendPct}%` : "—"}
              icon="event_available"
            />
            <MetricCard
              label="Активность"
              value={formatNumber(selectedStudent?.activityScore)}
              icon="bolt"
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <BarChartSection mockData={mockGpa} />
            <LineChartSection mockData={mockAttendance} />
          </section>
        </>
      ) : (
        <>
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

          {hasMockData && allStudents.length > 0 && (
            <section className="bg-surface-card rounded-xl border border-border-subtle p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-headline font-bold text-text-main">
                  Характеристики студента
                </h3>
                <select
                  value={selectedStudentId ?? ""}
                  onChange={(e) => setSelectedStudentId(e.target.value || null)}
                  className="bg-surface-container-low border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Выберите студента</option>
                  {allStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudent ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-surface-container-low rounded-lg p-4 text-center">
                      <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                        Рейтинг
                      </div>
                      <div className="text-lg font-headline font-bold text-primary">
                        {formatNumber(selectedStudent.totalScore)}
                      </div>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4 text-center">
                      <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                        Успеваемость
                      </div>
                      <div className="text-lg font-headline font-bold text-primary">
                        {formatNumber(selectedStudent.academicScore)}
                      </div>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4 text-center">
                      <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                        Посещаемость
                      </div>
                      <div className="text-lg font-headline font-bold text-primary">
                        {attendPct ?? "—"}%
                      </div>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4 text-center">
                      <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                        Активность
                      </div>
                      <div className="text-lg font-headline font-bold text-primary">
                        {formatNumber(selectedStudent.activityScore)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <span className="font-semibold text-text-main">{selectedStudent.name}</span>
                    <span>•</span>
                    <span>{selectedStudent.group}</span>
                    <span>•</span>
                    <span>#{selectedStudent.rank} место</span>
                    <span>•</span>
                    <span>{selectedStudent.course} курс</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-secondary text-sm">
                  Выберите студента для просмотра характеристик
                </div>
              )}
            </section>
          )}
        </>
      )}

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
