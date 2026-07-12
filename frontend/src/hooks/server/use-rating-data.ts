import { useRatingTable } from "./use-rating";
import { useDashboardMetrics } from "./use-dashboard";
import { useGpaDistribution } from "./use-dashboard";
import { useAttendanceTrends } from "./use-dashboard";

export function useRatingData(course?: number, search?: string) {
  const rating = useRatingTable(course, search);
  const metrics = useDashboardMetrics();
  const gpa = useGpaDistribution();
  const attendance = useAttendanceTrends();

  return {
    rating,
    metrics,
    gpa,
    attendance,
  };
}
