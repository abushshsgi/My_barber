import { useCallback } from "react";
import { useFavoriteSalonIds, useToggleFavoriteApi } from "@/hooks/use-favorites-api";

export function useFavorites() {
  const { data: ids = [], isLoading } = useFavoriteSalonIds();
  const { add, remove } = useToggleFavoriteApi();

  const toggle = useCallback(
    (id: string) => {
      const numId = parseInt(id, 10);
      if (!Number.isFinite(numId)) return;
      if (ids.includes(id)) {
        remove.mutate(numId);
      } else {
        add.mutate(numId);
      }
    },
    [ids, add, remove],
  );

  const isFav = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, isFav, loading: isLoading };
}
