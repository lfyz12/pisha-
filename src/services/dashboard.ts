import type { ApiResponse } from "@/types";
import type { DashboardMetrics, GpaBarData, AttendanceTrend } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
  const { data } = await apiClient.get<ApiResponse<DashboardMetrics>>("/dashboard/metrics");
  return data;
}

export async function getGpaDistribution(): Promise<ApiResponse<GpaBarData[]>> {
  const { data } = await apiClient.get<ApiResponse<GpaBarData[]>>("/dashboard/gpa-distribution");
  return data;
}

export async function getAttendanceTrends(): Promise<ApiResponse<AttendanceTrend[]>> {
  const { data } = await apiClient.get<ApiResponse<AttendanceTrend[]>>(
    "/dashboard/attendance-trends"
  );
  return data;
}
