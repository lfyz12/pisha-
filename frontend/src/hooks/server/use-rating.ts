import { useQuery } from "@tanstack/react-query";
import { getRatingTable } from "@/services/rating";
import type { ApiResponse, RatingStudent, RatingStats } from "@/types";

const RATING_KEYS = {
  all: ["rating"] as const,
  table: (course?: number, search?: string) => [...RATING_KEYS.all, { course, search }] as const,
};

export function useRatingTable(course?: number, search?: string) {
  return useQuery<ApiResponse<{ students: RatingStudent[]; stats: RatingStats }>, Error>({
    queryKey: RATING_KEYS.table(course, search),
    queryFn: () => getRatingTable({ course, search }),
  });
}
