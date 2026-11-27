import { createFileRoute } from "@tanstack/react-router";
import { GuideArticlePage } from "@/components/guides/GuideArticleView";
import { fetchGuideArticleSeo, guideHead } from "@/lib/guide-seo.server";
import type { SeoLocale } from "@/seo/constants";
import { localeGuardBeforeLoad } from "@/seo/create-landing-route";

export const Route = createFileRoute("/$locale/guides_/$slug")({
  beforeLoad: ({ params }) => localeGuardBeforeLoad(params.locale),
  loader: async ({ params }) => {
    const locale = params.locale as SeoLocale;
    const article = await fetchGuideArticleSeo(params.slug, locale);
    return { head: article ? guideHead(article, params.slug, locale) : null };
  },
  head: ({ loaderData, params }) =>
    loaderData?.head ?? { meta: [{ title: `${params.slug} | MySaloon` }] },
  component: function GuideLocalePage() {
    const { locale, slug } = Route.useParams();
    return <GuideArticlePage locale={locale as SeoLocale} slug={slug} />;
  },
});
