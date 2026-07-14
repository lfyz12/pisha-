import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { AdminOnly } from "@/components/admin-only";
import { StudentSelect } from "@/components/student-select";
import { useAuthStore } from "@/stores";
import { useRatingData, useStudentProfile } from "@/hooks";
import { formatNumber, cn } from "@/lib/utils";
import type { RatingStudent } from "@/types";
import {
  MetricCard,
  BarChartSection,
  LineChartSection,
  ScoringFormSection,
  ServerMonitoringSection,
  AILogicBuilderSection,
  StudentRatingTable,
} from "./components";

const courses = ["Все", "1", "2", "3", "4"];

export default function AnalyticsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isStudent = currentUser?.role === "student";

  const [activeCourse, setActiveCourse] = useState("Все");
  const courseParam = activeCourse === "Все" ? undefined : parseInt(activeCourse);

  const { rating, metrics } = useRatingData(courseParam);
  const ratingStudents: RatingStudent[] = rating.data?.data?.students ?? [];

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    isStudent ? (ratingStudents.find((s) => s.isCurrentUser)?.id ?? null) : null
  );

  const selectedStudent = selectedStudentId
    ? ratingStudents.find((s) => s.id === selectedStudentId)
    : ratingStudents.find((s) => s.isCurrentUser);

  const { data: profileData } = useStudentProfile(selectedStudent?.id ?? null);
  const profile = profileData?.data;

  const attendPct = profile?.attendancePct;

  const studentMetrics = isStudent
    ? [
        {
          label: "Общий балл",
          value: formatNumber(selectedStudent?.totalScore),
          icon: "star" as const,
          trend: selectedStudent
            ? {
                value: `#${selectedStudent.rank} место`,
                positive: selectedStudent.rank <= ratingStudents.length * 0.3,
              }
            : undefined,
        },
        {
          label: "Успеваемость",
          value: formatNumber(selectedStudent?.academicScore),
          secondary: "/ 5.0",
          icon: "school" as const,
          progress: selectedStudent ? { value: selectedStudent.academicScore, max: 5 } : undefined,
        },
        {
          label: "Посещаемость",
          value: attendPct != null ? `${attendPct}%` : "—",
          icon: "event_available" as const,
        },
        {
          label: "Активность",
          value: formatNumber(selectedStudent?.activityScore),
          icon: "bolt" as const,
        },
      ]
    : [];

  const m = metrics.data?.data;

  const adminMetrics = !isStudent
    ? [
        {
          label: "Всего студентов",
          value: m?.totalStudents?.toString() ?? "—",
          icon: "groups" as const,
        },
        {
          label: "Средний балл",
          value: formatNumber(m?.averageGpa),
          secondary: "/ 5.0",
          progress: m ? { value: (m.averageGpa / 5) * 100, max: 100 } : undefined,
          icon: "star" as const,
        },
        {
          label: "Посещаемость",
          value: `${m?.attendance ?? "—"}%`,
          icon: "event_available" as const,
        },
        {
          label: "Проектов",
          value: m?.projects?.toString() ?? "—",
          icon: "folder_managed" as const,
        },
        {
          label: "Новых заявок",
          value: m?.newRequests?.toString() ?? "—",
          icon: "notifications_active" as const,
          iconFill: true,
        },
      ]
    : [];

  const metricsList = isStudent ? studentMetrics : adminMetrics;

  return (
    <div className="space-y-8">
      {!isStudent && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Курс:
          </span>
          <div className="flex bg-surface-container-low p-1 rounded-lg border border-border-subtle">
            {courses.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCourse(c)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-label transition-all whitespace-nowrap",
                  activeCourse === c
                    ? "bg-surface-card shadow-sm text-primary font-semibold"
                    : "text-secondary hover:text-text-main"
                )}
              >
                {c === "Все" ? "Все" : `${c} курс`}
              </button>
            ))}
          </div>
        </div>
      )}

      {metricsList.length > 0 && (
        <section
          id="metrics-cards"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          {metricsList.map((metric, i) => (
            <MetricCard key={i} {...metric} />
          ))}
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartSection />
        <div id="attendance-chart">
          <LineChartSection />
        </div>
      </section>

      {ratingStudents.length > 0 && (
        <StudentRatingTable students={ratingStudents} activeCourse={activeCourse} />
      )}

      <AdminOnly>
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="bg-surface-card rounded-xl border border-border-subtle p-4 sm:p-6 xl:order-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-headline font-bold text-text-main">
                Характеристики студента
              </h3>
            </div>
            <div className="mb-4">
              <StudentSelect
                students={ratingStudents}
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                placeholder="Выберите студента"
                className="w-full"
              />
            </div>

            {selectedStudent ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <div className="text-[10px] text-secondary uppercase font-label tracking-wider mb-1">
                      Общий балл
                    </div>
                    <div className="text-base font-headline font-bold text-primary">
                      {formatNumber(selectedStudent.totalScore)}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <div className="text-[10px] text-secondary uppercase font-label tracking-wider mb-1">
                      Успеваемость
                    </div>
                    <div className="text-base font-headline font-bold text-primary">
                      {formatNumber(selectedStudent.academicScore)}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <div className="text-[10px] text-secondary uppercase font-label tracking-wider mb-1">
                      Посещаемость
                    </div>
                    <div className="text-base font-headline font-bold text-primary">
                      {attendPct ?? "—"}%
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <div className="text-[10px] text-secondary uppercase font-label tracking-wider mb-1">
                      Активность
                    </div>
                    <div className="text-base font-headline font-bold text-primary">
                      {formatNumber(selectedStudent.activityScore)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-secondary">
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
          </div>

          <div className="xl:order-1 md:col-span-2 xl:col-span-1">
            <ScoringFormSection />
          </div>

          <div className="xl:order-2">
            <ServerMonitoringSection />
          </div>

          <div className="xl:order-4">
            <AILogicBuilderSection />
          </div>
        </section>
      </AdminOnly>

      {!isStudent && ratingStudents.length === 0 && (
        <div className="text-center py-12 text-secondary text-sm flex flex-col items-center gap-2">
          <Icon name="info" className="text-xl" />
          <span>Загрузите Excel на странице рейтинга для просмотра аналитики</span>
        </div>
      )}
    </div>
  );
}
