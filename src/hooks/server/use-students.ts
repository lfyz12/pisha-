import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents, updateStudentRating } from "@/services/students";
import type { PaginatedResponse, Student, PaginationParams } from "@/types";

const STUDENT_KEYS = {
  all: ["students"] as const,
  lists: () => [...STUDENT_KEYS.all, "list"] as const,
  list: (params?: PaginationParams) => [...STUDENT_KEYS.lists(), params] as const,
  details: () => [...STUDENT_KEYS.all, "detail"] as const,
  detail: (id: string) => [...STUDENT_KEYS.details(), id] as const,
};

export function useStudents(params?: PaginationParams) {
  return useQuery<PaginatedResponse<Student>, Error>({
    queryKey: STUDENT_KEYS.list(params),
    queryFn: () => getStudents(params),
  });
}

export function useUpdateStudentRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => updateStudentRating(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
    },
  });
}
