import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { PageHeader } from "@/components/PageHeader";
import { trackEvent } from "@/lib/analytics";
import { resolveFetchBase } from "@/lib/api/base-url";
import type { SeoLocale } from "@/seo/constants";
import { localeGuardBeforeLoad } from "@/seo/create-landing-route";
import { guideIndexHead } from "@/lib/guide-seo.server";

const TITLE: Record<SeoLocale, { title: string; lead: string; empty: string }> = {
  uz: {
    title: "Qo'llanmalar",
    lead: "Soch parvarishi, Morf AI va MySaloon xizmatlari bo'yicha maqolalar.",
    empty: "Nashr etilgan maqolalar shu yerda chiqadi.",
  },
  ru: {
    title: "Руководства",
    lead: "Материалы об уходе, Morf AI и сервисах MySaloon.",
    empty: "Опубликованные статьи появятся здесь.",
  },
  en: {
    title: "Guides",
    lead: "Articles on hair care, Morf AI, and MySaloon.",
    empty: "Published articles will appear here.",
  },
};

export const Route = createFileRoute("/$locale/guides")({
  beforeLoad: ({ params }) => localeGuardBeforeLoad(params.locale),
  head: ({ params }) => guideIndexHead(params.locale as SeoLocale),
  component: LocaleGuidesPage,
});

function LocaleGuidesPage() {
  const locale = Route.useParams().locale as SeoLocale;
  const copy = TITLE[locale];
  const { data, isLoading } = useQuery({
    queryKey: ["guides", locale],
    queryFn: async () => {
      const res = await fetch(`${resolveFetchBase("")}/api/v1/content/articles/?locale=${locale}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [] as Array<{ slug: string; title: string; excerpt?: string }>;
      return (await res.json()) as Array<{ slug: string; title: string; excerpt?: string }>;
    },
  });

  useEffect(() => {
    trackEvent(
      "organic_landing_view",
      { surface: "guides_index", locale },
      { dedupeKey: `guides-${locale}` },
    );
  }, [locale]);

  const body = (
    <div className="px-4 pb-10 pt-2 md:px-0">
      <PageHeader title={copy.title} showBack sticky backFallback="/" />
      <p className="mt-2 text-sm text-muted-foreground">{copy.lead}</p>
      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">…</p>
      ) : !data?.length ? (
        <p className="mt-6 text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {data.map((row) => (
            <li key={row.slug} className="rounded-2xl border border-border bg-surface p-4">
              <Link
                to="/$locale/guides/$slug"
                params={{ locale, slug: row.slug }}
                className="text-base font-semibold text-foreground hover:underline"
              >
                {row.title}
              </Link>
              {row.excerpt ? (
                <p className="mt-1 text-sm text-muted-foreground">{row.excerpt}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return <DesktopPageSplit mobile={body} desktop={<div className="max-w-3xl">{body}</div>} />;
}
