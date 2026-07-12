import { create } from "zustand";
import type { Notification } from "@/types";
import * as notificationService from "@/services/notification";

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  fetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,

  fetch: async () => {
    set({ loading: true });
    const response = await notificationService.fetchNotifications();
    set({ notifications: response.data, loading: false });
  },

  markAsRead: async (id) => {
    await notificationService.markAsRead(id);
    set({
      notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    });
  },

  markAllAsRead: async () => {
    await notificationService.markAllAsRead();
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    });
  },

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
