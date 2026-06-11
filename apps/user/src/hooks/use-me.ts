import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMe, updateMe, type UpdateMePayload } from "@/lib/api/user";
import { getAuthUser, setSession } from "@/lib/auth";
import { getAuthUserId } from "@/lib/auth-user";
import { getUserAccessToken } from "@/lib/api/client";
import { authQueryEnabled } from "@/lib/auth-query";
import { userQueryKey } from "@/lib/query-keys";
import { needsOnboarding } from "@/lib/recommendations";

export const meQueryKeyBase = ["users", "me"] as const;

export function meQueryKeyFor(userId: number | null) {
  return userQueryKey(meQueryKeyBase, userId);
}

export function useMe() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: meQueryKeyFor(userId),
    queryFn: fetchMe,
    enabled: authQueryEnabled(!!userId),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMePayload) => updateMe(data),
    onSuccess: (user) => {
      const cached = getAuthUser();
      const refresh = localStorage.getItem("mybarber_user_refresh");
      const access = getUserAccessToken();
      if (access && refresh) {
        setSession(access, refresh, user);
      }
      void qc.invalidateQueries({ queryKey: meQueryKeyFor(user.id) });
    },
  });
}

export function useDisplayUser() {
  const { data: me } = useMe();
  const cached = getAuthUser();
  return {
    name: me?.full_name || cached?.name || "Foydalanuvchi",
    phone: me?.phone || cached?.phone || "",
    avatar: me?.avatar || null,
    id: me?.id ?? cached?.id,
    region: me?.region || "",
    birthYear: me?.birth_year ?? null,
  };
}

export function useOnboardingRequired() {
  const { data: me, isLoading } = useMe();
  return {
    required: me ? needsOnboarding(me) : false,
    isLoading,
    user: me,
  };
}

/** @deprecated Use meQueryKeyFor(getAuthUserId()) */
export const meQueryKey = meQueryKeyBase;
