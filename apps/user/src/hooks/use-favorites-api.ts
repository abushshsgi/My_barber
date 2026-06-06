import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addFavoriteSalon, fetchFavoriteSalons, removeFavoriteSalon } from "@/lib/api/favorites";

export const favoritesQueryKey = ["favorites"] as const;

export function useFavoriteSalonIds() {
  return useQuery({
    queryKey: favoritesQueryKey,
    queryFn: async () => {
      const data = await fetchFavoriteSalons();
      return data.results.map((r) => String(r.salon));
    },
    staleTime: 30_000,
  });
}

export function useToggleFavoriteApi() {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: (salonId: number) => addFavoriteSalon(salonId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: favoritesQueryKey }),
  });
  const remove = useMutation({
    mutationFn: (salonId: number) => removeFavoriteSalon(salonId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: favoritesQueryKey }),
  });
  return { add, remove };
}
