import { useQuery } from "@tanstack/react-query";
import { fetchMyReviews } from "@/lib/api/reviews";
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
