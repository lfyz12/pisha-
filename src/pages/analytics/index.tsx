import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { AdminOnly } from "@/components/admin-only";
import { StudentSelect } from "@/components/student-select";
import { useAuthStore, useMockDataStore } from "@/stores";
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

function detectCourse(groupName: string): number {
  const m = groupName.match(/(\d)/);
  return m ? parseInt(m[1]) : 3;
}

function filterByCourse(students: RatingStudent[], course: string): RatingStudent[] {
  if (course === "Все") return students;
  const courseNum = parseInt(course);
  return students.filter((s) => s.course === courseNum);
}

function recalcRank(students: RatingStudent[]): RatingStudent[] {
  return students.map((s, i) => ({ ...s, rank: i + 1 }));
}

function calcMetrics(students: RatingStudent[]) {
  if (students.length === 0) return null;
  const avgAcademic =
    Math.round((students.reduce((acc, s) => acc + s.academicScore, 0) / students.length) * 100) /
    100;
  const avgActivity =
    Math.round((students.reduce((acc, s) => acc + s.activityScore, 0) / students.length) * 10) / 10;
  const maxScore = students[0]?.totalScore ?? 0;
  return {
    averageGpa: avgAcademic,
    totalStudents: students.length,
    attendance: 85,
    projects: Math.round(students.length * 0.3),
    newRequests: Math.round(students.length * 0.15),
    avgActivity,
    maxScore,
  };
}

const courses = ["Все", "1", "2", "3", "4"];

export default function AnalyticsPage() {
  const mockStore = useMockDataStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const hasMockData = mockStore.parsedData !== null;
  const isStudent = currentUser?.role === "student";

  const allStudents = hasMockData ? mockStore.getRatingStudents() : [];
  const rawStudents = mockStore.parsedData?.students ?? [];

  const [activeCourse, setActiveCourse] = useState("Все");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    isStudent ? (allStudents.find((s) => s.isCurrentUser)?.id ?? null) : null
  );

  const filteredStudents = useMemo(() => {
    let result = filterByCourse(allStudents, activeCourse);
    result = recalcRank(result);
    return result;
  }, [allStudents, activeCourse]);

  const filteredRawStudents = useMemo(() => {
    if (activeCourse === "Все") return rawStudents;
    const courseNum = parseInt(activeCourse);
    return rawStudents.filter((s) => detectCourse(s.groupName) === courseNum);
  }, [rawStudents, activeCourse]);

  const mockMetrics = hasMockData ? calcMetrics(filteredStudents) : null;
  const mockGpa = useMemo(() => {
    if (!hasMockData) return undefined;
    const BUCKETS = [
      { min: 0, max: 2, label: "< 2.0" },
      { min: 2, max: 3, label: "2.0–3.0" },
      { min: 3, max: 3.5, label: "3.0–3.5" },
      { min: 3.5, max: 4, label: "3.5–4.0" },
      { min: 4, max: 4.5, label: "4.0–4.5" },
      { min: 4.5, max: 5, label: "4.5–5.0" },
    ];
    const counts = BUCKETS.map(() => 0);
    filteredStudents.forEach((s) => {
      for (let i = 0; i < BUCKETS.length; i++) {
        const b = BUCKETS[i];
        if (s.academicScore >= b.min && s.academicScore < b.max) {
          counts[i]++;
          break;
        }
      }
    });
    const max = Math.max(...counts, 1);
    return BUCKETS.map((b, i) => ({ label: b.label, value: Math.round((counts[i] / max) * 100) }));
  }, [filteredStudents, hasMockData]);

  const mockAttendance = useMemo(() => {
    if (!hasMockData) return undefined;
    if (filteredRawStudents.length === 0) return [];
    const maxWeeks = Math.max(...filteredRawStudents.map((s) => s.attendance.length), 0);
    if (maxWeeks === 0) return [];
    const trends: { month: string; value: number }[] = [];
    for (let w = 0; w < maxWeeks; w++) {
      let sum = 0;
      let count = 0;
      for (const st of filteredRawStudents) {
        if (w < st.attendance.length) {
          sum += st.attendance[w];
          count++;
        }
      }
      trends.push({
        month: `Нед ${w + 1}`,
        value: count > 0 ? Math.min(100, Math.round((sum / count) * 100)) : 0,
      });
    }
    return trends;
  }, [filteredRawStudents, hasMockData]);

  const selectedStudent = selectedStudentId
    ? filteredStudents.find((s) => s.id === selectedStudentId)
    : filteredStudents.find((s) => s.isCurrentUser);

  const selectedRaw = selectedStudent
    ? filteredRawStudents.find((s) => s.fullName === selectedStudent.name)
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

  const studentMetrics = isStudent
    ? [
        {
          label: "Общий балл",
          value: formatNumber(selectedStudent?.totalScore),
          icon: "star" as const,
          trend: selectedStudent
            ? {
                value: `#${selectedStudent.rank} место`,
                positive: selectedStudent.rank <= filteredStudents.length * 0.3,
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

  const m = mockMetrics;

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

  const metrics = isStudent ? studentMetrics : adminMetrics;

  return (
    <div className="space-y-8">
      {!isStudent && hasMockData && (
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

      {metrics.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {metrics.map((metric, i) => (
            <MetricCard key={i} {...metric} />
          ))}
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartSection mockData={mockGpa} />
        <LineChartSection mockData={mockAttendance} />
      </section>

      {hasMockData && filteredStudents.length > 0 && (
        <StudentRatingTable students={filteredStudents} activeCourse={activeCourse} />
      )}

      <AdminOnly>
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {hasMockData && filteredStudents.length > 0 && (
            <div className="bg-surface-card rounded-xl border border-border-subtle p-4 sm:p-6 xl:order-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-headline font-bold text-text-main">
                  Характеристики студента
                </h3>
              </div>
              <div className="mb-4">
                <StudentSelect
                  students={filteredStudents}
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
          )}

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

      {!hasMockData && !isStudent && (
        <div className="text-center py-12 text-secondary text-sm flex flex-col items-center gap-2">
          <Icon name="info" className="text-xl" />
          <span>Загрузите Excel на странице рейтинга для просмотра аналитики</span>
        </div>
      )}
    </div>
  );
}
