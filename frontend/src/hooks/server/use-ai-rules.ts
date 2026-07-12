import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAIRules, createAIRule } from "@/services/ai-rules";
import type { ApiResponse, AIRule } from "@/types";

const AI_RULES_KEYS = {
  all: ["ai-rules"] as const,
};

export function useAIRules() {
  return useQuery<ApiResponse<AIRule[]>, Error>({
    queryKey: AI_RULES_KEYS.all,
    queryFn: getAIRules,
  });
}

export function useCreateAIRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: Omit<AIRule, "id" | "createdAt">) => createAIRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_RULES_KEYS.all });
    },
  });
}
