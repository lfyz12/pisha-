import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";
import type { Student } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function getStudents(params?: PaginationParams): Promise<PaginatedResponse<Student>> {
  const { data } = await apiClient.get<PaginatedResponse<Student>>("/students", { params });
  return data;
}

export async function getStudent(id: string): Promise<ApiResponse<Student>> {
  const { data } = await apiClient.get<ApiResponse<Student>>(`/students/${id}`);
  return data;
}

export async function updateStudentRating(
  id: string,
  rating: number
): Promise<ApiResponse<Student>> {
  const { data } = await apiClient.patch<ApiResponse<Student>>(`/students/${id}`, { rating });
  return data;
}
