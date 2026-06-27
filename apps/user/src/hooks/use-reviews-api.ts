import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReview, fetchMyReviews, type CreateReviewPayload } from "@/lib/api/reviews";
import { bookingsQueryKeyBase } from "@/hooks/use-bookings-api";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";

export function useMyReviews() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: userQueryKey(["reviews", "mine"] as const, userId),
    queryFn: fetchMyReviews,
    staleTime: 30_000,
    enabled: authQueryEnabled(!!userId),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => createReview(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingsQueryKeyBase });
      void qc.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}
