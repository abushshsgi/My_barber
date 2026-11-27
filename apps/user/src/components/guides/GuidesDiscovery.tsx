import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { trackEvent } from "@/lib/analytics";
import { resolveFetchBase } from "@/lib/api/base-url";
import { guideCategories, rankGuides, type GuideCard } from "@/lib/guide-discovery";
import type { SeoLocale } from "@/seo/constants";

const COPY: Record<
  SeoLocale,
  {
    title: string;
    lead: string;
    search: string;
    all: string;
    featured: string;
    read: string;
    empty: string;
    none: string;
    error: string;
    minutes: string;
    feature: string;
    categories: Record<string, string>;
  }
> = {
  uz: {
    title: "Qo'llanmalar",
    lead: "Soch turmagi, parvarish va MySaloon xizmatlari haqida qisqa maqolalar.",
    search: "Maqola qidirish",
    all: "Barchasi",
    featured: "Tanlangan",
    read: "O'qish",
    empty: "Nashr etilgan maqolalar shu yerda chiqadi.",
    none: "Bu so'rov bo'yicha maqola topilmadi.",
    error: "Maqolalar hozir yuklanmadi. Birozdan keyin qayta urinib ko'ring.",
    minutes: "daqiqa",
    feature: "Shu mavzudagi xizmat",
    categories: {
      "morf-ai": "Morf AI",
      styles: "Soch turmagi",
      "hair-advisor": "Tarkib",
    },
  },
  ru: {
    title: "Руководства",
    lead: "Короткие материалы о стрижках, уходе и сервисах MySaloon.",
    search: "Найти статью",
    all: "Все",
    featured: "Главное",
    read: "Читать",
    empty: "Опубликованные статьи появятся здесь.",
    none: "По этому запросу статей нет.",
    error: "Статьи сейчас не загрузились. Попробуйте ещё раз чуть позже.",
    minutes: "мин",
    feature: "Сервис по этой теме",
    categories: {
      "morf-ai": "Morf AI",
      styles: "Стрижки",
      "hair-advisor": "Состав",
    },
  },
  en: {
    title: "Guides",
    lead: "Short articles on haircuts, care, and MySaloon.",
    search: "Search articles",
    all: "All",
    featured: "Featured",
    read: "Read",
    empty: "Published articles will appear here.",
    none: "No articles match this search.",
    error: "Articles could not be loaded. Try again in a moment.",
    minutes: "min",
    feature: "Feature for this topic",
    categories: {
      "morf-ai": "Morf AI",
      styles: "Haircuts",
      "hair-advisor": "Ingredients",
    },
  },
};

async function fetchPublishedGuides(locale: SeoLocale): Promise<GuideCard[]> {
  const res = await fetch(
    `${resolveFetchBase("")}/api/v1/content/articles/?locale=${encodeURIComponent(locale)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`guides ${res.status}`);
  const rows = (await res.json()) as GuideCard[];
  return rows.filter((row) => row.slug && row.title);
}

function featureHref(category: string): string | null {
  if (category === "styles") return "/explore";
  if (category === "hair-advisor") return "/ai-style/care/ingredient";
  if (category === "morf-ai") return "/ai-style";
  return null;
}

function categoryLabel(locale: SeoLocale, category: string): string {
  return COPY[locale].categories[category] || category;
}

function ArticleLink({
  locale,
  slug,
  className,
  children,
}: {
  locale: SeoLocale;
  slug: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (locale === "uz") {
    return (
      <Link to="/guides/$slug" params={{ slug }} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/$locale/guides/$slug" params={{ locale, slug }} className={className}>
      {children}
    </Link>
  );
}

export function GuidesDiscovery({ locale }: { locale: SeoLocale }) {
  const copy = COPY[locale];
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["guides", locale, "published"],
    queryFn: () => fetchPublishedGuides(locale),
    staleTime: 60_000,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    trackEvent(
      "organic_landing_view",
      { surface: "guides_index", locale },
      { dedupeKey: `guides-${locale}` },
    );
  }, [locale]);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) return;
    trackEvent(
      "guides_search",
      { locale, query_length: q.length },
      { dedupeKey: `guides-search-${locale}-${q.slice(0, 40)}` },
    );
  }, [debounced, locale]);

  const categories = useMemo(() => guideCategories(data ?? []), [data]);
  const ranked = useMemo(
    () => rankGuides(data ?? [], debounced, category),
    [data, debounced, category],
  );
  const featured = !debounced && !category ? ranked[0] : null;
  const rest = featured ? ranked.slice(1) : ranked;

  return (
    <div className="w-full pb-16 pt-2">
      <PageHeader title={copy.title} showBack sticky backFallback="/" />
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{copy.lead}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="guide-search">
          {copy.search}
        </label>
        <input
          id="guide-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.search}
          className="h-11 w-full rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 sm:max-w-sm"
        />
        {categories.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={copy.all}>
            <button
              type="button"
              className={`h-9 rounded-full px-3 text-sm ${category ? "text-muted-foreground" : "bg-foreground text-background"}`}
              onClick={() => setCategory("")}
            >
              {copy.all}
            </button>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`h-9 rounded-full px-3 text-sm ${category === item ? "bg-foreground text-background" : "text-muted-foreground"}`}
                onClick={() => {
                  setCategory(item);
                  trackEvent(
                    "guides_category_selected",
                    { locale, category: item },
                    { dedupeKey: `guides-cat-${locale}-${item}` },
                  );
                }}
              >
                {categoryLabel(locale, item)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {featureHref(category) ? (
        <a
          href={featureHref(category) || "/explore"}
          className="mt-3 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {copy.feature}
        </a>
      ) : null}

      {isLoading ? (
        <div className="mt-8 h-40 max-w-3xl animate-pulse rounded-2xl bg-surface" />
      ) : isError ? (
        <p className="mt-8 text-sm text-muted-foreground">{copy.error}</p>
      ) : !data?.length ? (
        <p className="mt-8 text-sm text-muted-foreground">{copy.empty}</p>
      ) : !ranked.length ? (
        <p className="mt-8 text-sm text-muted-foreground">{copy.none}</p>
      ) : (
        <>
          {featured ? <FeaturedArticle locale={locale} article={featured} /> : null}
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((article) => (
              <li key={article.slug}>
                <ArticleCard locale={locale} article={article} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FeaturedArticle({ locale, article }: { locale: SeoLocale; article: GuideCard }) {
  const copy = COPY[locale];
  return (
    <ArticleLink locale={locale} slug={article.slug} className="mt-8 grid gap-6 md:grid-cols-2">
      {article.cover_image_url ? (
        <img
          src={article.cover_image_url}
          alt={article.cover_alt || article.title}
          width={768}
          height={1024}
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="aspect-[4/3] rounded-2xl bg-surface" />
      )}
      <div className="flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {copy.featured}
          {article.category ? ` · ${categoryLabel(locale, article.category)}` : ""}
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {article.title}
        </h2>
        {article.excerpt ? (
          <p className="mt-3 text-base leading-7 text-muted-foreground">{article.excerpt}</p>
        ) : null}
        <p className="mt-4 text-sm text-muted-foreground">
          {article.reading_minutes ? `${article.reading_minutes} ${copy.minutes}` : copy.read}
        </p>
      </div>
    </ArticleLink>
  );
}

function ArticleCard({ locale, article }: { locale: SeoLocale; article: GuideCard }) {
  const copy = COPY[locale];
  return (
    <ArticleLink locale={locale} slug={article.slug} className="block">
      {article.cover_image_url ? (
        <img
          src={article.cover_image_url}
          alt={article.cover_alt || article.title}
          width={768}
          height={1024}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
      ) : null}
      {article.category ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {categoryLabel(locale, article.category)}
        </p>
      ) : null}
      <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">{article.title}</h2>
      {article.excerpt ? (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {article.excerpt}
        </p>
      ) : null}
      {article.reading_minutes ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {article.reading_minutes} {copy.minutes}
        </p>
      ) : null}
    </ArticleLink>
  );
}
