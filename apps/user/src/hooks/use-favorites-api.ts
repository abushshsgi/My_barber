import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addFavoriteSalon, fetchFavoriteSalons, removeFavoriteSalon } from "@/lib/api/favorites";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";

export const favoritesQueryKeyBase = ["favorites"] as const;

export function favoritesQueryKeyFor(userId: number | null) {
  return userQueryKey(favoritesQueryKeyBase, userId);
}

export function useFavoriteSalonIds() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: favoritesQueryKeyFor(userId),
    queryFn: async () => {
      const data = await fetchFavoriteSalons();
      return data.results.map((r) => String(r.salon));
    },
    staleTime: 30_000,
    enabled: authQueryEnabled(!!userId),
  });
}

export function useToggleFavoriteApi() {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: (salonId: number) => addFavoriteSalon(salonId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: favoritesQueryKeyBase }),
  });
  const remove = useMutation({
    mutationFn: (salonId: number) => removeFavoriteSalon(salonId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: favoritesQueryKeyBase }),
  });
  return { add, remove };
}
