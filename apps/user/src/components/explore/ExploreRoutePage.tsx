import { useEffect } from "react";
import i18n, { ensureLanguageResources, type AppLang } from "@/i18n/config";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ExploreDesktopPage } from "@/components/desktop/pages/ExploreDesktopPage";
import { ExploreMobilePage } from "@/components/explore/ExploreMobilePage";
import { trackEvent } from "@/lib/analytics";
import type { SeoLocale } from "@/seo/constants";

/** Explore katalog — `/explore` va `/$locale/explore` uchun umumiy UI. */
export function ExploreRoutePage({ locale }: { locale?: SeoLocale }) {
  useEffect(() => {
    trackEvent("catalog_opened", {}, { dedupeKey: "explore" });
  }, []);

  useEffect(() => {
    if (!locale || locale === "uz") return;
    const code = locale as AppLang;
    void ensureLanguageResources(code).then(() => {
      if ((i18n.resolvedLanguage || i18n.language || "uz").split("-")[0] !== code) {
        void i18n.changeLanguage(code);
      }
      document.documentElement.lang = code;
    });
  }, [locale]);

  useEffect(() => {
    document.documentElement.setAttribute("data-explore-lcp", "1");
    return () => {
      document.documentElement.removeAttribute("data-explore-lcp");
    };
  }, []);

  return (
    <DesktopPageSplit
      mobile={<ExploreMobilePage />}
      desktop={<ExploreDesktopPage />}
    />
  );
}