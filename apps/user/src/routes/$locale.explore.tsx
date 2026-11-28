import { createFileRoute } from "@tanstack/react-router";
import { ExploreRoutePage } from "@/components/explore/ExploreRoutePage";
import { buildRegistryHead } from "@/seo/build-head";
import type { SeoLocale } from "@/seo/constants";
import { localeGuardBeforeLoad } from "@/seo/create-landing-route";
import { EXPLORE_LCP_HERO_SRC } from "@/lib/explore-lcp-static";

export const Route = createFileRoute("/$locale/explore")({
  beforeLoad: ({ params }) => localeGuardBeforeLoad(params.locale),
  head: ({ params }) => {
    const locale = params.locale as SeoLocale;
    const head = buildRegistryHead("explore", locale);
    return {
      ...head,
      links: [
        ...(head.links ?? []),
        {
          rel: "preload",
          href: EXPLORE_LCP_HERO_SRC,
          as: "image",
          type: "image/webp",
          fetchPriority: "high",
        },
      ],
    };
  },
  component: function LocaleExplorePage() {
    const { locale } = Route.useParams();
    return <ExploreRoutePage locale={locale as SeoLocale} />;
  },
});