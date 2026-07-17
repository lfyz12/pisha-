import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteProject, listProjects, uploadProject } from "@/services/projects";
import type { ApiResponse, PaginatedResponse, StudentProject } from "@/types";

const POLL_INTERVAL_MS = 3000;

export const STUDENT_PROJECT_KEYS = {
  all: ["student-projects"] as const,
  list: (page: number) => [...STUDENT_PROJECT_KEYS.all, "list", page] as const,
};

function hasUnfinished(data?: PaginatedResponse<StudentProject>): boolean {
  return (data?.data ?? []).some(
    (project) => project.status === "pending" || project.status === "processing"
  );
}

export function useStudentProjects(page = 1, enabled = true) {
  return useQuery<PaginatedResponse<StudentProject>, Error>({
    queryKey: STUDENT_PROJECT_KEYS.list(page),
    queryFn: () => listProjects(page),
    enabled,
    refetchInterval: (query) => (hasUnfinished(query.state.data) ? POLL_INTERVAL_MS : false),
  });
}

export function useUploadStudentProject() {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<StudentProject>, Error, { file: File; title?: string }>({
    mutationFn: ({ file, title }) => uploadProject(file, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_PROJECT_KEYS.all });
    },
  });
}

export function useDeleteStudentProject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_PROJECT_KEYS.all });
    },
  });
}
