import { useQuery } from "@tanstack/react-query";
import { fetchSiteConfig } from "@/lib/api/site-config";

export function useSiteConfig() {
  return useQuery({
    queryKey: ["site", "config"],
    queryFn: fetchSiteConfig,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
