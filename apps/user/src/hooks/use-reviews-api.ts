import { useQuery } from "@tanstack/react-query";
import { fetchMyReviews } from "@/lib/api/reviews";
import { authQueryEnabled } from "@/lib/auth-query";

export function useMyReviews() {
  return useQuery({
    queryKey: ["reviews", "mine"],
    queryFn: fetchMyReviews,
    staleTime: 30_000,
    enabled: authQueryEnabled(),
  });
}
