import type { ApiResponse } from "@/types";
import type { Notification } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function fetchNotifications(): Promise<ApiResponse<Notification[]>> {
  const { data } = await apiClient.get<ApiResponse<Notification[]>>("/notifications");
  return data;
}

export async function markAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
  const { data } = await apiClient.patch<ApiResponse<Notification>>(
    `/notifications/${notificationId}/read`
  );
  return data;
}

export async function markAllAsRead(): Promise<ApiResponse<null>> {
  const { data } = await apiClient.post<ApiResponse<null>>("/notifications/mark-all-read");
  return data;
}
