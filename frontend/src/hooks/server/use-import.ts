import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadExcel } from "@/services/import";
import type { ApiResponse, ImportSummary } from "@/types";

const IMPORT_KEYS = {
  all: ["import"] as const,
};

const RATING_KEYS = {
  all: ["rating"] as const,
};

const DASHBOARD_KEYS = {
  all: ["dashboard"] as const,
};

const STUDENT_KEYS = {
  all: ["students"] as const,
};

export function useUploadExcel() {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<ImportSummary>,
    Error,
    { file: File; parser?: "auto" | "multi" | "flat" }
  >({
    mutationFn: ({ file, parser }) => uploadExcel(file, parser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RATING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: IMPORT_KEYS.all });
    },
  });
}
