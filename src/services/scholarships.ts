import type { ApiResponse } from "@/types";
import type { Scholarship, ScholarshipFilter } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function getScholarships(
  params?: ScholarshipFilter
): Promise<ApiResponse<Scholarship[]>> {
  const { data } = await apiClient.get("/scholarships", { params });
  return data;
}
