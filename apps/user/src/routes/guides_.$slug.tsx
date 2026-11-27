import { createFileRoute } from "@tanstack/react-router";
import { GuideArticlePage } from "@/components/guides/GuideArticleView";
import { fetchGuideArticleSeo, guideHead } from "@/lib/guide-seo.server";

export const Route = createFileRoute("/guides_/$slug")({
  loader: async ({ params }) => {
    const article = await fetchGuideArticleSeo(params.slug, "uz");
    return { head: article ? guideHead(article, params.slug, "uz") : null };
  },
  head: ({ loaderData, params }) =>
    loaderData?.head ?? { meta: [{ title: `${params.slug} | MySaloon` }] },
  component: function GuideUzPage() {
    const { slug } = Route.useParams();
    return <GuideArticlePage locale="uz" slug={slug} />;
  },
});
