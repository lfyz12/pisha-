import type { ApiResponse } from "@/types";
import type { AIRule } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function getAIRules(): Promise<ApiResponse<AIRule[]>> {
  const { data } = await apiClient.get<ApiResponse<AIRule[]>>("/ai-rules");
  return data;
}

export async function createAIRule(
  rule: Omit<AIRule, "id" | "createdAt">
): Promise<ApiResponse<AIRule>> {
  const { data } = await apiClient.post<ApiResponse<AIRule>>("/ai-rules", rule);
  return data;
}
