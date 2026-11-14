import { startTransition, useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { useAppTranslation } from "@/hooks/use-app-translation";

/** Til o'zgarganda sahifa qayta yuklanadi — faqat client mountdan keyin (hydration xavfsiz). */
export function LangAwareOutlet() {
  const { i18n } = useAppTranslation();
  const [lang, setLang] = useState("uz");

  useEffect(() => {
    const apply = (next: string) => {
      startTransition(() => {
        setLang(next.split("-")[0] || "uz");
      });
    };
    apply(i18n.resolvedLanguage || i18n.language || "uz");
    const onChange = (lng: string) => apply(lng);
    i18n.on("languageChanged", onChange);
    return () => {
      i18n.off("languageChanged", onChange);
    };
  }, [i18n]);

  return <Outlet key={lang} />;
}
