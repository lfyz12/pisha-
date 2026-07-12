import type { ApiResponse } from "@/types";
import { apiClient } from "@/lib/api-client";

export interface AccessPolicy {
  show_names_in_rating: boolean;
  allow_other_profiles: boolean;
  allow_other_attendance: boolean;
  allow_other_activities: boolean;
  allow_scoring_logs: boolean;
  allow_ai_rules: boolean;
  allow_global_notifications: boolean;
}

export async function getAccessPolicy(): Promise<ApiResponse<AccessPolicy>> {
  const { data } = await apiClient.get<ApiResponse<AccessPolicy>>("/security/policy/");
  return data;
}

export async function updateAccessPolicy(
  policy: Partial<AccessPolicy>
): Promise<ApiResponse<AccessPolicy>> {
  const { data } = await apiClient.patch<ApiResponse<AccessPolicy>>("/security/policy/", policy);
  return data;
}

export async function consumeCredentialBundle(
  bundleId: string
): Promise<ApiResponse<{ credentials: Array<{ studentId: string; temporaryPassword: string }> }>> {
  const { data } = await apiClient.post<
    ApiResponse<{ credentials: Array<{ studentId: string; temporaryPassword: string }> }>
  >(`/security/credential-bundles/${bundleId}/consume/`);
  return data;
}

export async function requestPasswordReset(
  groupName: string
): Promise<ApiResponse<{ message: string }>> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
    "/auth/password/forgot/",
    {
      groupName,
    }
  );
  return data;
}
