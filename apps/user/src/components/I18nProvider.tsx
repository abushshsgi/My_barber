import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { type AppLang } from "@/i18n/config";

function syncDocumentLang(lang: string) {
  const code = (lang.split("-")[0] || "uz") as AppLang;
  document.documentElement.lang = code;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState(() => i18n.resolvedLanguage || i18n.language || "uz");

  useEffect(() => {
    const onChange = (lng: string) => {
      setLang(lng);
      syncDocumentLang(lng);
    };

    syncDocumentLang(i18n.resolvedLanguage || i18n.language || "uz");
    i18n.on("languageChanged", onChange);
    i18n.on("loaded", onChange);

    return () => {
      i18n.off("languageChanged", onChange);
      i18n.off("loaded", onChange);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n} defaultNS="translation">
      <div data-app-lang={lang.split("-")[0]}>
        {children as ReactNode & Parameters<typeof I18nextProvider>[0]["children"]}
      </div>
    </I18nextProvider>
  );
}
