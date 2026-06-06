import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { mapNotification } from "@/lib/mappers/notification";

export const notificationsQueryKey = ["notifications"] as const;

export function useNotificationsApi() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: async () => (await fetchNotifications()).map(mapNotification),
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: notificationsQueryKey }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: notificationsQueryKey }),
  });
}
