import { create } from "zustand";
import type { ParsedExcelData, ExcelStudentRaw } from "@/lib/parse-rating-excel";
import type {
  Student,
  RatingStudent,
  RatingStats,
  DashboardMetrics,
  GpaBarData,
  AttendanceTrend,
} from "@/types";
import { useAuthStore } from "./use-auth-store";

interface MockDataState {
  parsedData: ParsedExcelData | null;
  fileName: string | null;

  setExcelData: (data: ParsedExcelData, fileName: string) => void;
  clear: () => void;

  getStudents: () => Student[];
  getRatingStudents: (course?: number, search?: string) => RatingStudent[];
  getRatingStats: () => RatingStats;
  getMetrics: () => DashboardMetrics;
  getGpaDistribution: () => GpaBarData[];
  getAttendanceTrends: () => AttendanceTrend[];
}

function detectCourse(groupName: string): number {
  const m = groupName.match(/(\d)/);
  return m ? parseInt(m[1]) : 3;
}

function toStudent(raw: ExcelStudentRaw, idx: number): Student {
  const parts = raw.fullName.split(" ");
  return {
    id: `mock-${idx}`,
    name: raw.fullName,
    initials: parts
      .map((p) => p[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    studentId: raw.groupName
      ? `${raw.groupName}-${String(idx + 1).padStart(3, "0")}`
      : `STU-${String(idx + 1).padStart(4, "0")}`,
    course: detectCourse(raw.groupName),
    rating: raw.averageScore,
  };
}

function calcActivityScore(s: ExcelStudentRaw): number {
  return (
    Math.round(
      (Object.values(s.scienceActivity).reduce((a, b) => a + b, 0) +
        Object.values(s.projectActivity).reduce((a, b) => a + b, 0) +
        Object.values(s.extracurricular).reduce((a, b) => a + b, 0)) *
        10
    ) / 10
  );
}

function matchUser(fullName: string): boolean {
  const authUser = useAuthStore.getState().currentUser;
  if (!authUser || authUser.role === "admin") return false;
  return fullName.toLowerCase().includes(authUser.name.toLowerCase().split(" ")[0] ?? "");
}

export const useMockDataStore = create<MockDataState>((set, get) => ({
  parsedData: null,
  fileName: null,

  setExcelData: (data, fileName) => set({ parsedData: data, fileName }),
  clear: () => set({ parsedData: null, fileName: null }),

  getStudents: () => {
    const { parsedData } = get();
    if (!parsedData) return [];
    return parsedData.students.map((s, i) => toStudent(s, i));
  },

  getRatingStudents: (course) => {
    const { parsedData } = get();
    if (!parsedData) return [];

    if (parsedData.students.length === 0) {
      console.warn("[mock-store] No students in parsed data");
    }

    let filtered = parsedData.students;

    if (course) {
      filtered = filtered.filter((s) => detectCourse(s.groupName) === course);
    }

    const sorted = [...filtered].sort((a, b) => b.totalScore - a.totalScore);
    return sorted.map((s, i): RatingStudent => {
      const prev = i > 0 ? sorted[i - 1] : null;
      const diff = prev ? Math.round((s.totalScore - prev.totalScore) * 10) / 10 : 0;
      let trend: "up" | "down" | "stable" = "stable";
      if (diff > 0) trend = "up";
      else if (diff < 0) trend = "down";

      return {
        id: `mock-${i}`,
        rank: i + 1,
        name: s.fullName,
        course: detectCourse(s.groupName),
        group: s.groupName,
        academicScore: s.averageScore,
        activityScore: calcActivityScore(s),
        totalScore: s.totalScore,
        trend,
        trendValue: trend !== "stable" ? Math.abs(diff) : undefined,
        isCurrentUser: matchUser(s.fullName),
      };
    });
  },

  getRatingStats: () => {
    const students = get().getRatingStudents();
    if (students.length === 0) {
      return {
        myPlace: 0,
        myPlaceChange: 0,
        topScore: 0,
        averageScore: 0,
        activityLevel: "Низкая",
      };
    }

    const currentUser = students.find((s) => s.isCurrentUser);
    const avgScore =
      Math.round((students.reduce((acc, s) => acc + s.totalScore, 0) / students.length) * 10) / 10;

    let activityLevel: "Высокая" | "Средняя" | "Низкая" = "Средняя";
    if (currentUser && students.length > 0) {
      const avgActivity = students.reduce((a, b) => a + b.activityScore, 0) / students.length;
      if (currentUser.activityScore > avgActivity) activityLevel = "Высокая";
      else if (currentUser.activityScore < avgActivity * 0.5) activityLevel = "Низкая";
    }

    return {
      myPlace: currentUser?.rank ?? 0,
      myPlaceChange: 3,
      topScore: students[0]?.totalScore ?? 0,
      averageScore: avgScore,
      activityLevel,
    };
  },

  getMetrics: () => {
    const { parsedData } = get();
    const students = get().getStudents();
    const avgScore =
      students.length > 0
        ? Math.round((students.reduce((acc, s) => acc + s.rating, 0) / students.length) * 100) / 100
        : 0;

    let attendanceAvg = 85;
    if (parsedData && parsedData.students.length > 0) {
      let total = 0;
      let count = 0;
      for (const s of parsedData.students) {
        for (const w of s.attendance) {
          total += w;
          count++;
        }
      }
      if (count > 0) {
        const avg = total / count;
        attendanceAvg = Math.min(100, Math.round(avg <= 1 ? avg * 100 : avg));
      }
    }

    return {
      totalStudents: students.length,
      totalStudentsChange: 5,
      averageGpa: avgScore,
      attendance: attendanceAvg,
      projects: Math.round(students.length * 0.3),
      newRequests: Math.round(students.length * 0.15),
    };
  },

  getGpaDistribution: () => {
    const students = get().getStudents();
    const BUCKETS = [
      { min: 0, max: 2, label: "< 2.0" },
      { min: 2, max: 3, label: "2.0–3.0" },
      { min: 3, max: 3.5, label: "3.0–3.5" },
      { min: 3.5, max: 4, label: "3.5–4.0" },
      { min: 4, max: 4.5, label: "4.0–4.5" },
      { min: 4.5, max: 5, label: "4.5–5.0" },
    ];
    const counts = BUCKETS.map(() => 0);
    students.forEach((s) => {
      for (let i = 0; i < BUCKETS.length; i++) {
        const b = BUCKETS[i];
        if (s.rating >= b.min && s.rating < b.max) {
          counts[i]++;
          break;
        }
      }
    });
    const max = Math.max(...counts, 1);
    return BUCKETS.map((b, i) => ({
      label: b.label,
      value: Math.round((counts[i] / max) * 100),
    }));
  },

  getAttendanceTrends: () => {
    const { parsedData } = get();
    if (!parsedData || parsedData.students.length === 0) {
      return [
        { month: "Нед 1", value: 82 },
        { month: "Нед 4", value: 78 },
        { month: "Нед 8", value: 85 },
        { month: "Нед 12", value: 80 },
        { month: "Нед 16", value: 88 },
      ];
    }

    const maxWeeks = Math.max(...parsedData.students.map((s) => s.attendance.length), 0);
    if (maxWeeks === 0) {
      return [
        { month: "Нед 1", value: 82 },
        { month: "Нед 4", value: 78 },
        { month: "Нед 8", value: 85 },
        { month: "Нед 12", value: 80 },
        { month: "Нед 16", value: 88 },
      ];
    }

    const trends: AttendanceTrend[] = [];
    for (let w = 0; w < maxWeeks; w++) {
      let sum = 0;
      let count = 0;
      for (const student of parsedData.students) {
        if (w < student.attendance.length) {
          sum += student.attendance[w];
          count++;
        }
      }
      trends.push({
        month: `Нед ${w + 1}`,
        value: count > 0 ? Math.min(100, Math.round((sum / count) * 100)) : 0,
      });
    }

    return trends;
  },
}));
