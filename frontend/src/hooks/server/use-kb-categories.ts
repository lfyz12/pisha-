import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryPayload,
} from "@/services/kb";
import type { ApiResponse, GrantCategory } from "@/types";

export const KB_CATEGORY_KEYS = {
  all: ["kb-categories"] as const,
};

export function useKBCategories() {
  return useQuery<GrantCategory[], Error>({
    queryKey: KB_CATEGORY_KEYS.all,
    queryFn: () => listCategories(),
  });
}

export function useCreateKBCategory() {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<GrantCategory>, Error, CategoryPayload>({
    mutationFn: (payload) => createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KB_CATEGORY_KEYS.all });
    },
  });
}

export function useUpdateKBCategory() {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<GrantCategory>, Error, { id: string } & CategoryPayload>({
    mutationFn: ({ id, ...payload }) => updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KB_CATEGORY_KEYS.all });
    },
  });
}

export function useDeleteKBCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KB_CATEGORY_KEYS.all });
    },
  });
}
