import axios from "axios";
import type { ChatMessage } from "@/types";

const chatClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

export interface ChatApiResponse {
  response: string;
}

export async function sendChatMessage(message: string): Promise<ChatApiResponse> {
  const { data } = await chatClient.post<ChatApiResponse>("/chat", { message });
  return data;
}

export async function checkHealth(): Promise<{ status: string }> {
  const { data } = await chatClient.get<{ status: string }>("/health");
  return data;
}

export function createChatMessage(role: "user" | "assistant", text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: new Date().toISOString(),
  };
}
