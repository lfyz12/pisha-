import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { demoDb, MAX_WEEKLY_LESSONS, seedDemoDb } from "./db";
import type { DemoStudent } from "./db";
import { parseRatingXlsx } from "./parse-xlsx";

const DEMO_LATENCY_MS = 150;

const DEMO_USER = {
  id: "demo-admin",
  name: "Демо Администратор",
  initials: "ДА",
  groupName: "admin",
  role: "admin" as const,
};

const DEMO_SCHOLARSHIPS = [
  {
    id: "demo-scholarship-1",
    title: "Академическая стипендия",
    description: "Базовая стипендия для студентов без академических задолженностей.",
    requiredScore: 3.5,
    amount: 2400,
    type: "academic",
  },
  {
    id: "demo-scholarship-2",
    title: "Повышенная стипендия",
    description: "Для студентов с высоким средним баллом успеваемости.",
    requiredScore: 4.5,
    amount: 4800,
    type: "enhanced",
  },
  {
    id: "demo-scholarship-3",
    title: "Стипендия за достижения",
    description: "За активную научную, проектную и внеучебную деятельность.",
    requiredScore: 4.8,
    amount: 7200,
    type: "achievement",
  },
];

const demoAccessPolicy = {
  show_names_in_rating: true,
  allow_other_profiles: true,
  allow_other_attendance: true,
  allow_other_activities: true,
  allow_scoring_logs: true,
  allow_ai_rules: true,
  allow_ai_chat: true,
  allow_global_notifications: true,
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function attendancePct(values: number[]): number {
  if (!values.length) return 0;
  return round1(Math.min(100, (average(values) / MAX_WEEKLY_LESSONS) * 100));
}

function activityPoints(student: DemoStudent): number {
  return round1(student.activities.reduce((sum, activity) => sum + activity.points, 0));
}

function studentRow(student: DemoStudent) {
  return {
    id: student.id,
    name: student.name,
    initials: student.initials,
    student_id: student.student_id,
    course: student.course,
    group_name: student.group_name,
    rating: student.rating,
    status: student.status,
    total_score: student.total_score,
    average_score: student.average_score,
  };
}

function filterStudents(params: Record<string, unknown>): DemoStudent[] {
  const course = Number(params.course) || 0;
  const search = String(params.search ?? "")
    .trim()
    .toLowerCase();
  return demoDb.students
    .filter((student) => {
      if (course && student.course !== course) return false;
      if (!search) return true;
      return (
        student.name.toLowerCase().includes(search) ||
        student.group_name.toLowerCase().includes(search) ||
        student.student_id.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => b.total_score - a.total_score || a.name.localeCompare(b.name));
}

function buildRating(params: Record<string, unknown>) {
  const students = filterStudents(params).map((student, index, list) => {
    const prev = index > 0 ? list[index - 1] : null;
    const diff = prev ? round1(student.total_score - prev.total_score) : 0;
    const trend = diff > 0 ? "up" : diff < 0 ? "down" : "stable";
    return {
      id: student.id,
      rank: index + 1,
      name: student.name,
      course: student.course,
      group: student.group_name,
      academicScore: round2(student.average_score),
      activityScore: activityPoints(student),
      totalScore: round2(student.total_score),
      trend,
      trendValue: trend !== "stable" ? Math.abs(diff) : null,
      isCurrentUser: false,
    };
  });

  const stats = {
    myPlace: 0,
    myPlaceChange: 0,
    topScore: students[0]?.totalScore ?? 0,
    averageScore: students.length ? round1(average(students.map((s) => s.totalScore))) : 0,
    activityLevel: "Средняя",
  };

  return { students, stats };
}

function buildStudentsPage(params: Record<string, unknown>) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 10);
  const filtered = filterStudents(params);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const data = filtered.slice((page - 1) * pageSize, page * pageSize).map(studentRow);
  return { data, total, page, pageSize, totalPages };
}

function buildProfile(student: DemoStudent) {
  return {
    ...studentRow(student),
    attendances: student.attendance.map((value, weekIndex) => ({
      week_index: weekIndex,
      value,
    })),
    activities: student.activities,
    project_count: student.activities.filter((a) => a.category === "project").length,
    attendance_pct: attendancePct(student.attendance),
  };
}

function buildMetrics() {
  return {
    totalStudents: demoDb.students.length,
    totalStudentsChange: 0,
    averageGpa: round2(average(demoDb.students.map((s) => s.average_score))),
    attendance: attendancePct(demoDb.students.flatMap((s) => s.attendance)),
    projects: demoDb.students.reduce(
      (sum, s) => sum + s.activities.filter((a) => a.category === "project").length,
      0
    ),
    newRequests: 0,
  };
}

function buildGpaDistribution() {
  const buckets: Array<[number, number, string]> = [
    [0, 2, "< 2.0"],
    [2, 3, "2.0–3.0"],
    [3, 3.5, "3.0–3.5"],
    [3.5, 4, "3.5–4.0"],
    [4, 4.5, "4.0–4.5"],
    [4.5, 5.01, "4.5–5.0"],
  ];
  const counts = buckets.map(([lo, hi]) => {
    return demoDb.students.filter((s) => s.average_score >= lo && s.average_score < hi).length;
  });
  const maxCount = Math.max(...counts, 1);
  return buckets.map(([, , label], index) => ({
    label,
    value: Math.round((counts[index] / maxCount) * 100),
  }));
}

function buildAttendanceTrends() {
  const maxWeek = Math.max(0, ...demoDb.students.map((s) => s.attendance.length));
  const trends: Array<{ month: string; value: number }> = [];
  for (let week = 0; week < maxWeek; week++) {
    const values = demoDb.students
      .map((s) => s.attendance[week])
      .filter((value): value is number => typeof value === "number");
    trends.push({ month: `Нед ${week + 1}`, value: attendancePct(values) });
  }
  return trends;
}

async function handleImport(config: InternalAxiosRequestConfig) {
  const form = config.data;
  const file =
    typeof FormData !== "undefined" && form instanceof FormData ? form.get("file") : null;
  if (!file || typeof file === "string") {
    throw Object.assign(new Error("Файл не передан"), { config });
  }
  const parsed = await parseRatingXlsx(file as Blob);
  seedDemoDb(parsed.students, parsed.events);
  return {
    students_imported: parsed.students.length,
    events_imported: parsed.events.length,
  };
}

function normalizePath(config: InternalAxiosRequestConfig): string {
  let url = config.url ?? "";
  if (!/^https?:/i.test(url)) {
    url = (config.baseURL ?? "") + url;
  }
  const path = url.replace(/^https?:\/\/[^/]+/i, "").split("?")[0] || "/";
  const withoutBase = path.replace(/^\/api(?=\/)/, "");
  return withoutBase.replace(/\/+$/, "") || "/";
}

function ok(config: InternalAxiosRequestConfig, payload: unknown, status = 200): AxiosResponse {
  return {
    data: { data: payload, status },
    status,
    statusText: "OK",
    headers: {},
    config,
  };
}

function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const data = config.data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (data ?? {}) as Record<string, unknown>;
}

async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await new Promise((resolve) => setTimeout(resolve, DEMO_LATENCY_MS));

  const method = (config.method ?? "get").toLowerCase();
  const path = normalizePath(config);
  const params = (config.params ?? {}) as Record<string, unknown>;

  if (method === "get" && path === "/auth/csrf") return ok(config, { csrfToken: "demo" });
  if (method === "post" && path === "/auth/login") {
    return ok(config, { user: DEMO_USER, nextStep: null });
  }
  if (method === "post" && path === "/auth/logout") return ok(config, null);
  if (method === "post" && path === "/auth/password/forgot") {
    return ok(config, { message: "В демо-режиме пароль не требуется" });
  }

  if (method === "get" && path === "/rating") return ok(config, buildRating(params));

  if (method === "get" && path === "/students") return ok(config, buildStudentsPage(params));
  const studentMatch = path.match(/^\/students\/([^/]+)(\/profile)?$/);
  if (studentMatch) {
    const student = demoDb.students.find((s) => s.id === studentMatch[1]);
    if (!student) return ok(config, null, 404);
    if (method === "get") return ok(config, buildProfile(student));
    if (method === "patch") {
      const body = parseBody(config);
      if (typeof body.rating === "number") student.rating = body.rating;
      if (typeof body.status === "string") {
        student.status = body.status as DemoStudent["status"];
      }
      return ok(config, studentRow(student));
    }
  }

  if (method === "get" && path === "/dashboard/metrics") return ok(config, buildMetrics());
  if (method === "get" && path === "/dashboard/gpa-distribution") {
    return ok(config, buildGpaDistribution());
  }
  if (method === "get" && path === "/dashboard/attendance-trends") {
    return ok(config, buildAttendanceTrends());
  }

  if (method === "get" && path === "/scholarships") return ok(config, DEMO_SCHOLARSHIPS);

  if (method === "get" && path === "/notifications") return ok(config, []);
  if (path.startsWith("/notifications/")) return ok(config, null);

  if (method === "post" && path === "/import/excel") return ok(config, await handleImport(config));

  if (method === "get" && path === "/server/metrics") {
    return ok(config, {
      cpuLoad: 12,
      ramUsage: 34,
      gpuUsage: 0,
      status: "online",
      location: "Демо-режим",
    });
  }
  if (method === "get" && path === "/scoring/logs") return ok(config, []);
  if (method === "post" && path === "/scoring") {
    const body = parseBody(config);
    return ok(config, {
      id: `demo-log-${Date.now()}`,
      activityType: String(body.activityType ?? ""),
      points: Number(body.points ?? 0),
      createdAt: new Date().toISOString(),
    });
  }
  if (method === "get" && path === "/security/policy") return ok(config, demoAccessPolicy);
  if (method === "patch" && path === "/security/policy") {
    Object.assign(demoAccessPolicy, parseBody(config));
    return ok(config, demoAccessPolicy);
  }
  if (method === "get" && path === "/ai-rules") return ok(config, []);

  // Всё остальное (ai/*, kb/*, projects, мутации) — безопасный пустой успех.
  return ok(config, method === "get" ? [] : null);
}

/** Подменяет сетевой адаптер axios-клиента на локальный обработчик demo DB. */
export function installDemoAdapter(client: AxiosInstance): void {
  client.defaults.adapter = demoAdapter;
}
