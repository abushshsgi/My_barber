import { Outlet } from "@tanstack/react-router";
import { useAppTranslation } from "@/hooks/use-app-translation";

/** Til o'zgarganda sahifa qayta yuklanadi — tarjima kalitlari qolmasligi uchun. */
export function LangAwareOutlet() {
  const { i18n } = useAppTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "uz";

  return <Outlet key={lang} />;
}
