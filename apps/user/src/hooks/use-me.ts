import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchMe, updateMe, type UpdateMePayload } from "@/lib/api/user";
import { birthYearToAgeGroup, type AgeGroup } from "@/lib/age-groups";
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
  const firstName = me?.first_name?.trim() || "";
  const lastName = me?.last_name?.trim() || "";
  const fullName = me?.full_name || [firstName, lastName].filter(Boolean).join(" ") || cached?.name || "Foydalanuvchi";
  return {
    name: fullName,
    firstName: firstName || fullName.split(" ")[0] || "",
    lastName: lastName || fullName.split(" ").slice(1).join(" ") || "",
    phone: me?.phone || cached?.phone || "",
    avatar: me?.avatar || null,
    id: me?.id ?? cached?.id,
    region: me?.region || "",
    birthYear: me?.birth_year ?? null,
    age: me?.age ?? null,
  };
}

export function useUserAgeGroup(): AgeGroup | null {
  const { data: me } = useMe();
  return useMemo(() => birthYearToAgeGroup(me?.birth_year ?? null), [me?.birth_year]);
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
