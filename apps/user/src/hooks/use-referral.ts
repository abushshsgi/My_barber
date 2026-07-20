import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claimReferralTrial, fetchMyReferral } from "@/lib/api/referrals";
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

export function useClaimReferralTrial() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: claimReferralTrial,
    onSuccess: (data) => {
      qc.setQueryData(userQueryKey(referralQueryKey, userId), data);
      void qc.invalidateQueries({ queryKey: userQueryKey(referralQueryKey, userId) });
      void qc.invalidateQueries({ queryKey: ["subscriptions", "me"] });
    },
  });
}
