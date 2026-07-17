import type {
  ApiResponse,
  CategoryRef,
  GrantCategory,
  KBDocument,
  PaginatedResponse,
} from "@/types";
import { apiClient } from "@/lib/api-client";

function mapCategories(raw: unknown): CategoryRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: Record<string, unknown>) => ({
    slug: String(item.slug ?? ""),
    name: String(item.name ?? ""),
  }));
}

function mapDocument(raw: Record<string, unknown>): KBDocument {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    sourceType: raw.source_type === "url" ? "url" : "file",
    sourceUrl: raw.source_url ? String(raw.source_url) : null,
    status: (raw.status as KBDocument["status"]) ?? "pending",
    error: raw.error ? String(raw.error) : null,
    summary: raw.summary ? String(raw.summary) : null,
    categories: mapCategories(raw.categories),
    chunkCount: Number(raw.chunk_count ?? raw.chunkCount ?? 0),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ""),
  };
}

function mapCategory(raw: Record<string, unknown>): GrantCategory {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    description: String(raw.description ?? ""),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
  };
}

export async function listDocuments(page = 1): Promise<PaginatedResponse<KBDocument>> {
  const { data } = await apiClient.get<PaginatedResponse<Record<string, unknown>>>(
    "/ai/kb/documents/",
    { params: { page } }
  );
  return { ...data, data: data.data.map(mapDocument) };
}

export interface UploadDocumentPayload {
  file?: File;
  sourceUrl?: string;
  title?: string;
}

export async function uploadDocument({
  file,
  sourceUrl,
  title,
}: UploadDocumentPayload): Promise<ApiResponse<KBDocument>> {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  } else if (sourceUrl) {
    formData.append("source_url", sourceUrl);
  }
  if (title) {
    formData.append("title", title);
  }

  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    "/ai/kb/documents/",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return { ...data, data: mapDocument(data.data) };
}

export async function updateDocument(
  id: string,
  payload: { title?: string }
): Promise<ApiResponse<KBDocument>> {
  const { data } = await apiClient.patch<ApiResponse<Record<string, unknown>>>(
    `/ai/kb/documents/${id}/`,
    payload
  );
  return { ...data, data: mapDocument(data.data) };
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/ai/kb/documents/${id}/`);
}

export async function reingestDocument(id: string): Promise<ApiResponse<KBDocument>> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    `/ai/kb/documents/${id}/reingest/`
  );
  return { ...data, data: mapDocument(data.data) };
}

// The backend does not paginate categories — the full list is returned in `data`.
export async function listCategories(): Promise<GrantCategory[]> {
  const { data } =
    await apiClient.get<ApiResponse<Record<string, unknown>[]>>("/ai/kb/categories/");
  return data.data.map(mapCategory);
}

export interface CategoryPayload {
  name?: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

export async function createCategory(
  payload: CategoryPayload
): Promise<ApiResponse<GrantCategory>> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    "/ai/kb/categories/",
    payload
  );
  return { ...data, data: mapCategory(data.data) };
}

export async function updateCategory(
  id: string,
  payload: CategoryPayload
): Promise<ApiResponse<GrantCategory>> {
  const { data } = await apiClient.patch<ApiResponse<Record<string, unknown>>>(
    `/ai/kb/categories/${id}/`,
    payload
  );
  return { ...data, data: mapCategory(data.data) };
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/ai/kb/categories/${id}/`);
}
