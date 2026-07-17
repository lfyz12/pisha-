import { create } from "zustand";

interface ChatState {
  currentSessionId: string | null;
  isStreaming: boolean;
  draft: string;
  setCurrentSession: (id: string | null) => void;
  setStreaming: (value: boolean) => void;
  setDraft: (value: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentSessionId: null,
  isStreaming: false,
  draft: "",
  setCurrentSession: (id) => set({ currentSessionId: id }),
  setStreaming: (value) => set({ isStreaming: value }),
  setDraft: (value) => set({ draft: value }),
}));
