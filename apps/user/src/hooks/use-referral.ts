import { useQuery } from "@tanstack/react-query";
import { fetchMyReferral } from "@/lib/api/referrals";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";

export const referralQueryKey = ["users", "referral"] as const;

export function useMyReferral() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: userQueryKey(referralQueryKey, userId),
    queryFn: fetchMyReferral,
    enabled: authQueryEnabled(!!userId),
    staleTime: 60_000,
  });
}
