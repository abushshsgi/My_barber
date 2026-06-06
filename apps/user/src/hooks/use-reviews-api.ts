import { useQuery } from "@tanstack/react-query";
import { fetchMyReviews } from "@/lib/api/reviews";

export function useMyReviews() {
  return useQuery({
    queryKey: ["reviews", "mine"],
    queryFn: fetchMyReviews,
    staleTime: 30_000,
  });
}
