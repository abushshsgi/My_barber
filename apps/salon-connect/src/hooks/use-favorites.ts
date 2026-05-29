import { useCallback, useEffect, useState } from "react";

const KEY = "mysaloon.favorites";

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: string[]) => {
    setIds(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const isFav = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, isFav, persist };
}
