import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildRegistryHead } from "@/seo/build-head";
import type { SeoLocale } from "@/seo/constants";
import { localeGuardBeforeLoad } from "@/seo/create-landing-route";

export const Route = createFileRoute("/$locale/morf-ai/hairstyles")({
  ssr: false,
  beforeLoad: ({ params }) => localeGuardBeforeLoad(params.locale),
  head: ({ params }) => buildRegistryHead("morf-ai-hairstyles", params.locale as SeoLocale),
  component: function Page() {
    const { locale } = Route.useParams();
    return <SeoLandingPage pageId="morf-ai-hairstyles" locale={locale as SeoLocale} />;
  },
});
