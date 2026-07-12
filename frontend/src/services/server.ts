import type { ApiResponse } from "@/types";
import type { ServerMetrics } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function getServerMetrics(): Promise<ApiResponse<ServerMetrics>> {
  const { data } = await apiClient.get<ApiResponse<ServerMetrics>>("/server/metrics");
  return data;
}
