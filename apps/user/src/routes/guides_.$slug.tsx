import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { PageHeader } from "@/components/PageHeader";
import { resolveFetchBase } from "@/lib/api/base-url";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/guides_/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug} | Qo'llanmalar` }],
  }),
  component: GuideArticlePage,
});

type GuideArticle = {
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  conversion_cta_href?: string;
  conversion_cta_label?: string;
  conversion_event?: string;
};

async function fetchGuide(slug: string): Promise<GuideArticle | null> {
  const res = await fetch(
    `${resolveFetchBase("")}/api/v1/content/articles/${encodeURIComponent(slug)}/?locale=uz`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return null;
  return (await res.json()) as GuideArticle;
}

function GuideArticlePage() {
  const { slug } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["guide", slug],
    queryFn: () => fetchGuide(slug),
  });

  useEffect(() => {
    if (!data) return;
    trackEvent(
      (data.conversion_event as "blog_article_view") || "blog_article_view",
      { slug, surface: "guides" },
      { dedupeKey: `guide-${slug}` },
    );
  }, [data, slug]);

  if (isLoading) {
    return (
      <div className="px-4 py-8 text-sm text-muted-foreground">Yuklanmoqda…</div>
    );
  }

  if (isError || !data) throw notFound();

  const ctaHref = data.conversion_cta_href || "/ai-style";
  const ctaLabel = data.conversion_cta_label || "Boshlash";

  const body = (
    <article className="px-4 pb-12 pt-2 md:px-0">
      <PageHeader title={data.title} showBack sticky backFallback="/guides" />
      <nav className="mt-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/guides" className="hover:text-foreground">
          Qo'llanmalar
        </Link>
        <span className="px-1">/</span>
        <span>{data.title}</span>
      </nav>
      {data.excerpt ? (
        <p className="mt-4 text-base text-muted-foreground">{data.excerpt}</p>
      ) : null}
      <div className="prose prose-neutral mt-6 max-w-none whitespace-pre-wrap text-sm dark:prose-invert">
        {data.content}
      </div>
      <div className="mt-8">
        <Link
          to={ctaHref}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-bold text-background"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );

  return <DesktopPageSplit mobile={body} desktop={<div className="max-w-3xl">{body}</div>} />;
}