import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";
import { mapNotification } from "@/lib/mappers/notification";

export const notificationsQueryKeyBase = ["notifications"] as const;

export function notificationsQueryKeyFor(userId: number | null) {
  return userQueryKey(notificationsQueryKeyBase, userId);
}

export function useNotificationsApi() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: notificationsQueryKeyFor(userId),
    queryFn: async () => (await fetchNotifications()).map(mapNotification),
    staleTime: 15_000,
    enabled: authQueryEnabled(!!userId),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: notificationsQueryKeyBase }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: notificationsQueryKeyBase }),
  });
}
