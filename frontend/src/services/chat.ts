import type { ApiResponse, ChatMessage, ChatSession, PaginatedResponse } from "@/types";
import { apiClient } from "@/lib/api-client";
import { config } from "@/config";

function mapSession(raw: Record<string, unknown>): ChatSession {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ""),
  };
}

function mapMessage(raw: Record<string, unknown>): ChatMessage {
  return {
    id: String(raw.id ?? ""),
    role: raw.role === "assistant" ? "assistant" : "user",
    content: String(raw.content ?? ""),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
  };
}

export async function listSessions(page = 1): Promise<PaginatedResponse<ChatSession>> {
  const { data } = await apiClient.get<PaginatedResponse<Record<string, unknown>>>(
    "/ai/chat/sessions/",
    { params: { page } }
  );
  return { ...data, data: data.data.map(mapSession) };
}

export async function createSession(): Promise<ApiResponse<ChatSession>> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>("/ai/chat/sessions/");
  return { ...data, data: mapSession(data.data) };
}

export async function deleteSession(id: string): Promise<void> {
  await apiClient.delete(`/ai/chat/sessions/${id}/`);
}

export async function listMessages(sessionId: string): Promise<ApiResponse<ChatMessage[]>> {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>(
    `/ai/chat/sessions/${sessionId}/messages/`
  );
  return { ...data, data: data.data.map(mapMessage) };
}

export interface StreamHandlers {
  onToken?: (token: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

interface StreamFrame {
  type: "token" | "done" | "error";
  content?: string;
  message?: string;
}

function getCsrfToken(): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("csrftoken="))
    ?.split("=")[1];
  return cookie ? decodeURIComponent(cookie) : null;
}

/**
 * POSTs a user message and consumes the SSE stream of the assistant reply.
 * Resolves with the full assistant text on the `done` frame, rejects on an
 * `error` frame, a non-OK HTTP status or a network failure.
 */
export async function streamMessage(
  sessionId: string,
  content: string,
  { onToken, onDone, onError, signal }: StreamHandlers = {}
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  const response = await fetch(
    `${config.api.baseUrl}/ai/chat/sessions/${sessionId}/messages/stream/`,
    {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ content }),
      signal,
    }
  );

  if (!response.ok) {
    let message = `Ошибка сервера (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // keep default message
    }
    onError?.(message);
    throw new Error(message);
  }

  if (!response.body) {
    const message = "Браузер не поддерживает потоковые ответы";
    onError?.(message);
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  const handleFrame = (frame: string) => {
    const dataLines = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());
    if (dataLines.length === 0) return; // heartbeat (`: ping`) or blank frame

    let parsed: StreamFrame;
    try {
      parsed = JSON.parse(dataLines.join("\n")) as StreamFrame;
    } catch {
      return;
    }

    if (parsed.type === "token" && parsed.content) {
      fullText += parsed.content;
      onToken?.(parsed.content);
    } else if (parsed.type === "done") {
      if (typeof parsed.content === "string") fullText = parsed.content;
      onDone?.(fullText);
    } else if (parsed.type === "error") {
      throw new Error(parsed.message ?? "Ошибка генерации ответа");
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const frame = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        handleFrame(frame);
        separatorIndex = buffer.indexOf("\n\n");
      }
    }
    if (buffer.trim()) {
      handleFrame(buffer);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка потока ответа";
    onError?.(message);
    throw error instanceof Error ? error : new Error(message);
  }

  return fullText;
}
