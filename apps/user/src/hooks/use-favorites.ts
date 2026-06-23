import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { hasValidUserSession } from "@/lib/api/client";
import { useFavoriteSalonIds, useToggleFavoriteApi } from "@/hooks/use-favorites-api";

export function useFavorites() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: ids = [], isLoading } = useFavoriteSalonIds();
  const { add, remove } = useToggleFavoriteApi();

  const toggle = useCallback(
    (id: string) => {
      if (!hasValidUserSession()) {
        toast.message(t("salon.loginForFavorite", { defaultValue: "Sevimlilar uchun tizimga kiring" }));
        void navigate({ to: "/auth", search: { redirect: `/salon/${id}` } });
        return;
      }

      const numId = parseInt(id, 10);
      if (!Number.isFinite(numId)) return;

      if (ids.includes(id)) {
        remove.mutate(numId);
      } else {
        add.mutate(numId);
      }
    },
    [ids, add, remove, navigate, t],
  );

  const isFav = useCallback((id: string) => ids.includes(id), [ids]);

  return {
    ids,
    toggle,
    isFav,
    loading: isLoading,
    isPending: add.isPending || remove.isPending,
  };
}
