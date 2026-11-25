import { notFound } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildRegistryHead } from "./build-head";
import type { SeoLocale } from "./constants";
import type { LandingPageId } from "./content/landings";

export function seoLandingRouteOptions(pageId: LandingPageId, locale: SeoLocale) {
  return {
    ssr: false as const,
    head: () => buildRegistryHead(pageId, locale),
    component: function SeoLandingRouteComponent() {
      return <SeoLandingPage pageId={pageId} locale={locale} />;
    },
  };
}

export function localeGuardBeforeLoad(locale: string): void {
  if (locale !== "ru" && locale !== "en") throw notFound();
}
