import { useQuery } from "@tanstack/react-query";
import { getScholarships } from "@/services/scholarships";
import type { ApiResponse, Scholarship, ScholarshipFilter } from "@/types";

const SCHOLARSHIP_KEYS = {
  all: ["scholarships"] as const,
  list: (filter?: ScholarshipFilter) => [...SCHOLARSHIP_KEYS.all, filter] as const,
};

export function useScholarships(filter?: ScholarshipFilter) {
  return useQuery<ApiResponse<Scholarship[]>, Error>({
    queryKey: SCHOLARSHIP_KEYS.list(filter),
    queryFn: () => getScholarships(filter),
  });
}
