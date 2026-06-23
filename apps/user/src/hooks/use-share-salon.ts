import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Salon } from "@/lib/mock-data";
import { shareSalon } from "@/lib/share-salon";

export function useShareSalon(salon: Pick<Salon, "id" | "name" | "address"> | null | undefined) {
  const { t } = useTranslation();

  return useCallback(async () => {
    if (!salon) return;
    try {
      const result = await shareSalon(salon);
      if (result === "copied") {
        toast.success(t("salon.shareCopied", { defaultValue: "Havola nusxalandi" }));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(
        err instanceof Error
          ? err.message
          : t("salon.shareFailed", { defaultValue: "Ulashib bo'lmadi" }),
      );
    }
  }, [salon, t]);
}
