import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserAccount } from "@/types";

interface AuthState {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  login: (groupName: string, password: string) => { success: boolean; error?: string };
  loginAs: (account: UserAccount) => void;
  logout: () => void;
}

const MOCK_PASSWORD = "1234";

export const MOCK_ACCOUNTS: UserAccount[] = [
  { id: "admin", name: "Администратор", initials: "АД", groupName: "admin", role: "admin" },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,

      login: (groupName, password) => {
        if (password !== MOCK_PASSWORD) {
          return { success: false, error: "Неверный пароль" };
        }

        const match = MOCK_ACCOUNTS.find(
          (a) => a.groupName.toLowerCase() === groupName.toLowerCase()
        );
        if (match) {
          set({ currentUser: match, isAuthenticated: true });
          return { success: true };
        }

        return {
          success: false,
          error: "Аккаунт не найден. Для входа используйте admin/1234 или выберите студента из списка.",
        };
      },

      loginAs: (account) => {
        set({ currentUser: account, isAuthenticated: true });
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ currentUser: state.currentUser, isAuthenticated: state.isAuthenticated }),
    }
  )
);
