import { useQuery } from "@tanstack/react-query";
import { fetchRegions } from "@/lib/api/user";

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: fetchRegions,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
