import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import type { UserAccount } from "@/types";
import { apiClient } from "@/lib/api-client";

export const MOCK_ACCOUNTS: UserAccount[] = [
  { id: "admin", name: "Администратор", initials: "АД", groupName: "admin", role: "admin" },
];

interface AuthState {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (groupName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAs: (account: UserAccount) => void;
  logout: () => void;
}

interface LoginResponse {
  data: {
    token: string;
    user: UserAccount;
  };
  status: number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (groupName, password) => {
        if (!groupName.trim() || !password) {
          return { success: false, error: "Введите логин и пароль" };
        }

        set({ isLoading: true });
        try {
          const { data } = await apiClient.post<LoginResponse>("/auth/login/", {
            groupName: groupName.trim(),
            password,
          });

          localStorage.setItem("auth-token", data.data.token);
          set({
            currentUser: data.data.user,
            isAuthenticated: true,
            isLoading: false,
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

      loginAs: (account) => {
        set({ currentUser: account, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("auth-token");
        set({ currentUser: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
