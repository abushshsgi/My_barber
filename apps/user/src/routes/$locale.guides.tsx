import { createFileRoute } from "@tanstack/react-router";
import { GuidesDiscovery } from "@/components/guides/GuidesDiscovery";
import type { SeoLocale } from "@/seo/constants";
import { localeGuardBeforeLoad } from "@/seo/create-landing-route";
import { guideIndexHead } from "@/lib/guide-seo.server";

export const Route = createFileRoute("/$locale/guides")({
  beforeLoad: ({ params }) => localeGuardBeforeLoad(params.locale),
  head: ({ params }) => guideIndexHead(params.locale as SeoLocale),
  component: function LocaleGuidesPage() {
    const locale = Route.useParams().locale as SeoLocale;
    return <GuidesDiscovery locale={locale} />;
  },
});
