import { useQuery } from "@tanstack/react-query";
import { getStudentProfile } from "@/services/students";
import type { ApiResponse, StudentProfile } from "@/types";

const STUDENT_PROFILE_KEYS = {
  all: ["student-profile"] as const,
  detail: (id: string) => [...STUDENT_PROFILE_KEYS.all, id] as const,
};

export function useStudentProfile(id: string | null | undefined) {
  return useQuery<ApiResponse<StudentProfile>, Error>({
    queryKey: STUDENT_PROFILE_KEYS.detail(id ?? ""),
    queryFn: () => getStudentProfile(id!),
    enabled: Boolean(id),
  });
}
