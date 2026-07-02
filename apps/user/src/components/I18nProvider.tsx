import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { type AppLang } from "@/i18n/config";

function syncDocumentLang(lang: string) {
  const code = (lang.split("-")[0] || "uz") as AppLang;
  document.documentElement.lang = code;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // SSR va hydration bir xil bo'lishi uchun dastlab "uz"; clientda localStorage o'qiladi.
  const [lang, setLang] = useState("uz");

  useEffect(() => {
    const resolved = i18n.resolvedLanguage || i18n.language || "uz";
    setLang(resolved);
    syncDocumentLang(resolved);

    const onChange = (lng: string) => {
      setLang(lng);
      syncDocumentLang(lng);
    };

    i18n.on("languageChanged", onChange);
    i18n.on("loaded", onChange);

    return () => {
      i18n.off("languageChanged", onChange);
      i18n.off("loaded", onChange);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n} defaultNS="translation">
      <div data-app-lang={lang.split("-")[0]}>{children}</div>
    </I18nextProvider>
  );
}
