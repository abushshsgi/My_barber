import { Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/** Til o'zgarganda sahifa qayta yuklanadi — tarjima kalitlari qolmasligi uchun. */
export function LangAwareOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "uz";

  return <Outlet key={`${pathname}:${lang}`} />;
}
