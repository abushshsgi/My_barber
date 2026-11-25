import { createFileRoute, notFound } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildRegistryHead } from "@/seo/build-head";
import type { SeoLocale } from "@/seo/constants";

export const Route = createFileRoute("/$locale/morf-ai/")({
  ssr: false,
  beforeLoad: ({ params }) => {
    if (params.locale !== "ru" && params.locale !== "en") throw notFound();
  },
  head: ({ params }) => buildRegistryHead("morf-ai-hub", params.locale as SeoLocale),
  component: LocaleMorfHubPage,
});

function LocaleMorfHubPage() {
  const { locale } = Route.useParams();
  return <SeoLandingPage pageId="morf-ai-hub" locale={locale as SeoLocale} />;
}
