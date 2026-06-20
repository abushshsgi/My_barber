import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserSessions, revokeOtherSessions, revokeUserSession } from "@/lib/api/sessions";
import { getAuthUserId } from "@/lib/auth-user";
import { authQueryEnabled } from "@/lib/auth-query";
import { userQueryKey } from "@/lib/query-keys";

export const sessionsQueryKey = ["users", "sessions"] as const;

function sessionsKey(userId: number | null) {
  return userQueryKey(sessionsQueryKey, userId);
}

export function useUserSessions() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: sessionsKey(userId),
    queryFn: fetchUserSessions,
    enabled: authQueryEnabled(!!userId),
    staleTime: 15_000,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: (id: number) => revokeUserSession(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: sessionsKey(userId) }),
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: () => revokeOtherSessions(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: sessionsKey(userId) }),
  });
}
