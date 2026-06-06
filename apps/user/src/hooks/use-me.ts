import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMe, updateMe } from "@/lib/api/user";
import { getAuthUser, setSession } from "@/lib/auth";
import { getUserAccessToken } from "@/lib/api/client";

export const meQueryKey = ["users", "me"] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    enabled: Boolean(getUserAccessToken()),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      const cached = getAuthUser();
      const refresh = localStorage.getItem("mybarber_user_refresh");
      const access = getUserAccessToken();
      if (access && refresh) {
        setSession(access, refresh, user);
      }
      void qc.invalidateQueries({ queryKey: meQueryKey });
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
  };
}
