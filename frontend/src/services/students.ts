import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";
import type { Student, StudentActivity, StudentProfile, StudentStatus } from "@/types";
import { apiClient } from "@/lib/api-client";

function mapStudent(raw: Record<string, unknown>): Student {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    initials: String(raw.initials ?? ""),
    studentId: String(raw.student_id ?? raw.studentId ?? ""),
    course: Number(raw.course ?? 0),
    rating: Number(raw.rating ?? 0),
    status: (raw.status as StudentStatus) ?? "active",
    groupName: raw.group_name ? String(raw.group_name) : undefined,
  };
}

function mapProfile(raw: Record<string, unknown>): StudentProfile {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    initials: String(raw.initials ?? ""),
    studentId: String(raw.student_id ?? raw.studentId ?? ""),
    course: Number(raw.course ?? 0),
    groupName: String(raw.group_name ?? raw.groupName ?? ""),
    rating: Number(raw.rating ?? 0),
    status: (raw.status as StudentStatus) ?? "active",
    totalScore: Number(raw.total_score ?? raw.totalScore ?? 0),
    averageScore: Number(raw.average_score ?? raw.averageScore ?? 0),
    attendances: Array.isArray(raw.attendances)
      ? raw.attendances.map((a: Record<string, unknown>) => ({
          weekIndex: Number(a.week_index ?? a.weekIndex ?? 0),
          value: Number(a.value ?? 0),
        }))
      : [],
    activities: Array.isArray(raw.activities)
      ? raw.activities.map((a: Record<string, unknown>) => ({
          category: String(a.category ?? "") as StudentActivity["category"],
          name: String(a.name ?? ""),
          points: Number(a.points ?? 0),
        }))
      : [],
    projectCount: Number(raw.project_count ?? raw.projectCount ?? 0),
    attendancePct: Number(raw.attendance_pct ?? raw.attendancePct ?? 0),
  };
}

export async function getStudents(params?: PaginationParams): Promise<PaginatedResponse<Student>> {
  const { data } = await apiClient.get<PaginatedResponse<Record<string, unknown>>>("/students", {
    params,
  });
  return {
    ...data,
    data: data.data.map(mapStudent),
  };
}

export async function getStudent(id: string): Promise<ApiResponse<StudentProfile>> {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(`/students/${id}`);
  return { ...data, data: mapProfile(data.data) };
}

export async function getStudentProfile(id: string): Promise<ApiResponse<StudentProfile>> {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(
    `/students/${id}/profile`
  );
  return { ...data, data: mapProfile(data.data) };
}

export async function updateStudentRating(
  id: string,
  rating: number
): Promise<ApiResponse<Student>> {
  const { data } = await apiClient.patch<ApiResponse<Record<string, unknown>>>(`/students/${id}`, {
    rating,
  });
  return { ...data, data: mapStudent(data.data) };
}

export async function updateStudentStatus(
  id: string,
  status: StudentStatus
): Promise<ApiResponse<Student>> {
  const { data } = await apiClient.patch<ApiResponse<Record<string, unknown>>>(`/students/${id}`, {
    status,
  });
  return { ...data, data: mapStudent(data.data) };
}
