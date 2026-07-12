import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getScoringLogs, createScoring } from "@/services/scoring";
import type { ApiResponse, ScoringLog, ScoringPayload } from "@/types";

const SCORING_KEYS = {
  all: ["scoring"] as const,
  logs: () => [...SCORING_KEYS.all, "logs"] as const,
};

export function useScoringLogs() {
  return useQuery<ApiResponse<ScoringLog[]>, Error>({
    queryKey: SCORING_KEYS.logs(),
    queryFn: () => getScoringLogs(),
  });
}

export function useCreateScoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ScoringPayload) => createScoring(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCORING_KEYS.all });
    },
  });
}
