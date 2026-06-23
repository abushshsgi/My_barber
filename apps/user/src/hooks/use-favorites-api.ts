import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { addFavoriteSalon, fetchFavoriteSalons, removeFavoriteSalon } from "@/lib/api/favorites";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";
import { salonsQueryKey } from "@/hooks/use-salons";

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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const userId = getAuthUserId();
  const queryKey = favoritesQueryKeyFor(userId);

  const patchIds = (salonId: number, add: boolean) => {
    const sid = String(salonId);
    qc.setQueryData<string[]>(queryKey, (prev = []) => {
      if (add) return prev.includes(sid) ? prev : [...prev, sid];
      return prev.filter((id) => id !== sid);
    });
  };

  const add = useMutation({
    mutationFn: (salonId: number) => addFavoriteSalon(salonId),
    onMutate: async (salonId) => {
      await qc.cancelQueries({ queryKey: favoritesQueryKeyBase });
      const previous = qc.getQueryData<string[]>(queryKey);
      patchIds(salonId, true);
      return { previous };
    },
    onError: (err, _salonId, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      toast.error(
        err instanceof Error
          ? err.message
          : t("salon.favoriteError", { defaultValue: "Sevimlilarni saqlab bo'lmadi" }),
      );
    },
    onSuccess: () => {
      toast.success(t("salon.favoriteAdded", { defaultValue: "Sevimlilarga qo'shildi" }));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: favoritesQueryKeyBase });
      void qc.invalidateQueries({ queryKey: salonsQueryKey });
    },
  });

  const remove = useMutation({
    mutationFn: (salonId: number) => removeFavoriteSalon(salonId),
    onMutate: async (salonId) => {
      await qc.cancelQueries({ queryKey: favoritesQueryKeyBase });
      const previous = qc.getQueryData<string[]>(queryKey);
      patchIds(salonId, false);
      return { previous };
    },
    onError: (err, _salonId, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      toast.error(
        err instanceof Error
          ? err.message
          : t("salon.favoriteError", { defaultValue: "Sevimlilarni saqlab bo'lmadi" }),
      );
    },
    onSuccess: () => {
      toast.success(t("salon.favoriteRemoved", { defaultValue: "Sevimlilardan olib tashlandi" }));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: favoritesQueryKeyBase });
      void qc.invalidateQueries({ queryKey: salonsQueryKey });
    },
  });

  return { add, remove };
}
