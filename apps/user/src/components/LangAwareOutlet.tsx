import { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { useAppTranslation } from "@/hooks/use-app-translation";

/** Til o'zgarganda sahifa qayta yuklanadi — faqat client mountdan keyin (hydration xavfsiz). */
export function LangAwareOutlet() {
  const { i18n } = useAppTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const lang = mounted ? i18n.resolvedLanguage || i18n.language || "uz" : "uz";

  return <Outlet key={mounted ? lang : "ssr"} />;
}
