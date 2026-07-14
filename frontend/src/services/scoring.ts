import type { ApiResponse, PaginationParams } from "@/types";
import type { ScoringLog, ScoringPayload } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function getScoringLogs(
  params?: PaginationParams
): Promise<ApiResponse<ScoringLog[]>> {
  const { data } = await apiClient.get<ApiResponse<ScoringLog[]>>("/scoring/logs", { params });
  return data;
}

export async function createScoring(payload: ScoringPayload): Promise<ApiResponse<ScoringLog>> {
  const { data } = await apiClient.post<ApiResponse<ScoringLog>>("/scoring", payload);
  return data;
}
