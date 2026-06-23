import { useCallback, useState } from "react";
import type { Salon } from "@/lib/mock-data";

type ShareSalon = Pick<Salon, "id" | "name" | "address" | "coverUrl" | "coverSeed" | "category" | "rating">;

export function useShareSalon(salon: ShareSalon | null | undefined) {
  const [open, setOpen] = useState(false);
  const openShare = useCallback(() => setOpen(true), []);

  return {
    openShare,
    shareOpen: open,
    setShareOpen: setOpen,
    shareSalon: salon ?? null,
  };
}
