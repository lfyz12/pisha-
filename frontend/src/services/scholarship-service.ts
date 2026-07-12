import type { ApiResponse } from "@/types";
import type { ScholarshipOffer } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function fetchScholarshipOffers(): Promise<ApiResponse<ScholarshipOffer[]>> {
  const { data } = await apiClient.get<ApiResponse<ScholarshipOffer[]>>("/scholarships");
  return data;
}
