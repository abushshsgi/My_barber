import { useQuery } from "@tanstack/react-query";
import { fetchSalonBarberServices } from "@/lib/api/salons";
import { catalogQueryEnabled } from "@/lib/auth-query";
import { mapApiServices } from "@/lib/mappers/salon";

export function useSalonBarberServices(salonId: string, barberId: string | null) {
  return useQuery({
    queryKey: ["salons", salonId, "barber-services", barberId],
    queryFn: () => fetchSalonBarberServices(salonId, barberId!),
    enabled: catalogQueryEnabled(Boolean(salonId) && Boolean(barberId)),
    select: (data) => mapApiServices(data),
    retry: 1,
  });
}
