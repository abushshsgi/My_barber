import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchMe, updateMe, type UpdateMePayload } from "@/lib/api/user";
import { birthYearToAgeGroup, type AgeGroup } from "@/lib/age-groups";
import { getAuthUser, setSession } from "@/lib/auth";
import { hasValidUserSession, getUserAccessToken } from "@/lib/api/client";
import { authQueryEnabled } from "@/lib/auth-query";
import { userQueryKey } from "@/lib/query-keys";
import { needsOnboarding } from "@/lib/recommendations";
import { addressesQueryKey } from "@/hooks/use-addresses";
import { barbersQueryKey } from "@/hooks/use-barbers";
import { salonsQueryKey } from "@/hooks/use-salons";

export const meQueryKeyBase = ["users", "me"] as const;

export function meQueryKeyFor(userId: number | null) {
  return userQueryKey(meQueryKeyBase, userId);
}

export function useMe() {
  const loggedIn = hasValidUserSession();
  return useQuery({
    queryKey: meQueryKeyFor(loggedIn ? getAuthUser()?.id ?? -1 : null),
    queryFn: fetchMe,
    enabled: authQueryEnabled(loggedIn),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMePayload) => updateMe(data),
    onSuccess: (user, variables) => {
      const cached = getAuthUser();
      const refresh = localStorage.getItem("mybarber_user_refresh");
      const access = getUserAccessToken();
      if (access && refresh) {
        setSession(access, refresh, user);
      }
      void qc.invalidateQueries({ queryKey: meQueryKeyFor(user.id) });
      const locationChanged =
        "region" in variables ||
        "latitude" in variables ||
        "longitude" in variables;
      if (locationChanged) {
        void qc.invalidateQueries({ queryKey: salonsQueryKey });
        void qc.invalidateQueries({ queryKey: barbersQueryKey });
      }
      if (variables.onboarding_completed) {
        void qc.invalidateQueries({ queryKey: userQueryKey(addressesQueryKey, user.id) });
      }
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
