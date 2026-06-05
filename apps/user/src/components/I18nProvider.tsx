import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { type AppLang } from "@/i18n/config";

function syncDocumentLang(lang: string) {
  const code = (lang.split("-")[0] || "uz") as AppLang;
  document.documentElement.lang = code;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    syncDocumentLang(i18n.language || "uz");
    const onChange = (lng: string) => syncDocumentLang(lng);
    i18n.on("languageChanged", onChange);
    return () => {
      i18n.off("languageChanged", onChange);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {children as ReactNode & Parameters<typeof I18nextProvider>[0]["children"]}
    </I18nextProvider>
  );
}
