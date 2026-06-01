import { useCallback, useEffect, useState } from "react";
import { useFavoriteSalonIds } from "@/hooks/use-user-data";

const KEY = "mysaloon.favorites";

export function useFavorites() {
  const apiFavorites = useFavoriteSalonIds();
  const [localIds, setLocalIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLocalIds(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: string[]) => {
    setLocalIds(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const toggleLocal = useCallback((id: string) => {
    setLocalIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const ids = apiFavorites.canSync ? apiFavorites.ids : localIds;
  const toggle = apiFavorites.canSync ? apiFavorites.toggle : toggleLocal;
  const isFav = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, isFav, persist, syncing: apiFavorites.canSync };
}
