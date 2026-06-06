import { apiJson } from "./client";
import { apiList } from "./list-utils";
import type { ApiNotification } from "./types";

export async function fetchNotifications(): Promise<ApiNotification[]> {
  return apiList<ApiNotification>("/api/v1/notifications/");
}

export async function markNotificationRead(id: number): Promise<{ status: string }> {
  return apiJson(`/api/v1/notifications/${id}/read/`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<{ status: string }> {
  return apiJson("/api/v1/notifications/mark-all-read/", { method: "POST" });
}
