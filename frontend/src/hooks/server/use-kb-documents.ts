import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDocument,
  listDocuments,
  reingestDocument,
  updateDocument,
  uploadDocument,
  type UploadDocumentPayload,
} from "@/services/kb";
import type { ApiResponse, KBDocument, PaginatedResponse } from "@/types";

const POLL_INTERVAL_MS = 3000;

export const KB_DOCUMENT_KEYS = {
  all: ["kb-documents"] as const,
  list: (page: number) => [...KB_DOCUMENT_KEYS.all, "list", page] as const,
};

function hasUnfinished(data?: PaginatedResponse<KBDocument>): boolean {
  return (data?.data ?? []).some((doc) => doc.status === "pending" || doc.status === "processing");
}

export function useKBDocuments(page = 1) {
  return useQuery<PaginatedResponse<KBDocument>, Error>({
    queryKey: KB_DOCUMENT_KEYS.list(page),
    queryFn: () => listDocuments(page),
    refetchInterval: (query) => (hasUnfinished(query.state.data) ? POLL_INTERVAL_MS : false),
  });
}

export function useUploadKBDocument() {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<KBDocument>, Error, UploadDocumentPayload>({
    mutationFn: (payload) => uploadDocument(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KB_DOCUMENT_KEYS.all });
    },
  });
}

export function useUpdateKBDocument() {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<KBDocument>, Error, { id: string; title: string }>({
    mutationFn: ({ id, title }) => updateDocument(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KB_DOCUMENT_KEYS.all });
    },
  });
}

export function useDeleteKBDocument() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KB_DOCUMENT_KEYS.all });
    },
  });
}

export function useReingestKBDocument() {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<KBDocument>, Error, string>({
    mutationFn: (id) => reingestDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KB_DOCUMENT_KEYS.all });
    },
  });
}
