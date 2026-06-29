import type { ApiResponse } from "@/types";
import type { RatingStudent, RatingStats } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function getRatingTable(params?: {
  course?: number;
  search?: string;
}): Promise<ApiResponse<{ students: RatingStudent[]; stats: RatingStats }>> {
  const { data } = await apiClient.get("/rating", { params });
  return data;
}
