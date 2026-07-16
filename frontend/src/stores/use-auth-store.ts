import axios from "axios";
import { create } from "zustand";

import { apiClient } from "@/lib/api-client";
import type { UserAccount } from "@/types";

export type AuthNextStep =
  "password_change_required" | "mfa_setup_required" | "mfa_required" | null;

interface AuthState {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  nextStep: AuthNextStep;
  login: (
    groupName: string,
    password: string,
    mfaCode?: string
  ) => Promise<{ success: boolean; error?: string }>;
  completeStep: () => void;
  setNextStep: (nextStep: AuthNextStep) => void;
  logout: () => Promise<void>;
}

interface AuthResponse {
  data: { user: UserAccount; nextStep: AuthNextStep };
}

async function ensureCsrfCookie() {
  await apiClient.get("/auth/csrf/");
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  nextStep: null,

  login: async (groupName, password, mfaCode) => {
    if (!groupName.trim() || !password) {
      return { success: false, error: "Введите логин и пароль" };
    }
    set({ isLoading: true });
    try {
      await ensureCsrfCookie();
      const { data } = await apiClient.post<AuthResponse>("/auth/login/", {
        groupName: groupName.trim(),
        password,
        mfaCode,
      });
      set({
        currentUser: data.data.user,
        isAuthenticated: data.data.nextStep !== "mfa_required",
        isLoading: false,
        nextStep: data.data.nextStep,
      });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        return { success: false, error: error.response.data.message };
      }
      return { success: false, error: "Ошибка входа" };
    }
  },

  completeStep: () => set({ nextStep: null }),
  setNextStep: (nextStep) => set({ nextStep }),

  logout: async () => {
    try {
      await ensureCsrfCookie();
      await apiClient.post("/auth/logout/");
    } finally {
      set({ currentUser: null, isAuthenticated: false, nextStep: null });
    }
  },
}));
