import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";

/** useTranslation with the app singleton — lazy route chunks stay in sync with I18nProvider. */
export function useAppTranslation() {
  return useTranslation("translation", { i18n });
}
