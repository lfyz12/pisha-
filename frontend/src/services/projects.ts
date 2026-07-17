import type { ApiResponse, PaginatedResponse, StudentProject } from "@/types";
import { apiClient } from "@/lib/api-client";

function mapProject(raw: Record<string, unknown>): StudentProject {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    status: (raw.status as StudentProject["status"]) ?? "pending",
    error: raw.error ? String(raw.error) : null,
    summary: raw.summary ? String(raw.summary) : null,
    categories: Array.isArray(raw.categories)
      ? raw.categories.map((item: Record<string, unknown>) => ({
          slug: String(item.slug ?? ""),
          name: String(item.name ?? ""),
        }))
      : [],
    chunkCount: Number(raw.chunk_count ?? raw.chunkCount ?? 0),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
  };
}

export async function listProjects(page = 1): Promise<PaginatedResponse<StudentProject>> {
  const { data } = await apiClient.get<PaginatedResponse<Record<string, unknown>>>(
    "/ai/projects/",
    { params: { page } }
  );
  return { ...data, data: data.data.map(mapProject) };
}

export async function uploadProject(
  file: File,
  title?: string
): Promise<ApiResponse<StudentProject>> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) {
    formData.append("title", title);
  }

  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    "/ai/projects/",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return { ...data, data: mapProject(data.data) };
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/ai/projects/${id}/`);
}
