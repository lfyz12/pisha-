import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSession, deleteSession, listMessages, listSessions } from "@/services/chat";
import type { ApiResponse, ChatMessage, ChatSession, PaginatedResponse } from "@/types";

export const CHAT_SESSION_KEYS = {
  all: ["chat-sessions"] as const,
  list: (page: number) => [...CHAT_SESSION_KEYS.all, "list", page] as const,
  messages: (sessionId: string) => [...CHAT_SESSION_KEYS.all, "messages", sessionId] as const,
};

export function useChatSessions(page = 1) {
  return useQuery<PaginatedResponse<ChatSession>, Error>({
    queryKey: CHAT_SESSION_KEYS.list(page),
    queryFn: () => listSessions(page),
  });
}

export function useChatMessages(sessionId: string | null) {
  return useQuery<ApiResponse<ChatMessage[]>, Error>({
    queryKey: CHAT_SESSION_KEYS.messages(sessionId ?? ""),
    queryFn: () => listMessages(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

export function useCreateChatSession() {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<ChatSession>, Error, void>({
    mutationFn: () => createSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_SESSION_KEYS.all });
    },
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_SESSION_KEYS.all });
    },
  });
}
