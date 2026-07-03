import { fetchSalon } from "@/lib/api/salons";
import { mapSalonDetail } from "@/lib/mappers/salon";
import { getQueryClient } from "@/lib/query-client";
import { salonsQueryKey } from "@/hooks/use-salons";

export function prefetchSalonDetail(id: string): void {
  if (!id) return;
  const queryClient = getQueryClient();
  if (!queryClient) return;

  void queryClient.prefetchQuery({
    queryKey: [...salonsQueryKey, "detail", id],
    queryFn: async () => mapSalonDetail(await fetchSalon(id)),
    staleTime: 60_000,
  });
}
