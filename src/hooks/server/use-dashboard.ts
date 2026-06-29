import { useQuery } from "@tanstack/react-query";
import { getDashboardMetrics, getGpaDistribution, getAttendanceTrends } from "@/services/dashboard";
import type { ApiResponse, DashboardMetrics, GpaBarData, AttendanceTrend } from "@/types";

const DASHBOARD_KEYS = {
  all: ["dashboard"] as const,
  metrics: () => [...DASHBOARD_KEYS.all, "metrics"] as const,
  gpaDistribution: () => [...DASHBOARD_KEYS.all, "gpa-distribution"] as const,
  attendanceTrends: () => [...DASHBOARD_KEYS.all, "attendance-trends"] as const,
};

export function useDashboardMetrics() {
  return useQuery<ApiResponse<DashboardMetrics>, Error>({
    queryKey: DASHBOARD_KEYS.metrics(),
    queryFn: getDashboardMetrics,
  });
}

export function useGpaDistribution() {
  return useQuery<ApiResponse<GpaBarData[]>, Error>({
    queryKey: DASHBOARD_KEYS.gpaDistribution(),
    queryFn: getGpaDistribution,
  });
}

export function useAttendanceTrends() {
  return useQuery<ApiResponse<AttendanceTrend[]>, Error>({
    queryKey: DASHBOARD_KEYS.attendanceTrends(),
    queryFn: getAttendanceTrends,
  });
}
