import { Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { trackEvent, type AnalyticsEventName } from "@/lib/analytics";
import {
  parseArticleMarkdown,
  readingMinutes,
  tableOfContents,
  type Inline,
} from "@/lib/article-markdown";
import { resolveFetchBase } from "@/lib/api/base-url";
import { SITE_ORIGIN, type SeoLocale } from "@/seo/constants";
import { localizedPath } from "@/seo/url";

type Source = { title?: string; url?: string };

export type GuideArticle = {
  slug: string;
  locale: string;
  category: string;
  title: string;
  seo_title: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  cover_alt: string;
  cover_width: number;
  cover_height: number;
  author: string;
  reviewed_by: string;
  sources: Source[];
  related_style_ids: string[];
  related_slugs: string[];
  conversion_cta_href: string;
  conversion_cta_label: string;
  conversion_event: string;
  status: string;
  meta_description: string;
  published_locales: string[];
};

type StyleCard = {
  id: string;
  title: string;
  image: string;
};

const RELATED_TITLE: Record<string, Record<SeoLocale, string>> = {
  "virtual-soch-turmagini-sinab-korish": {
    uz: "Virtual soch turmagini sinab ko'rish",
    ru: "Как примерить стрижку виртуально",
    en: "Try a haircut on your own photo",
  },
  "textured-crop-soch-turmagi": {
    uz: "Textured Crop soch turmagi",
    ru: "Стрижка Textured Crop",
    en: "The Textured Crop haircut",
  },
  "shampun-tarkibini-tekshirish": {
    uz: "Shampun tarkibini tekshirish",
    ru: "Как проверить состав шампуня",
    en: "How to read a shampoo ingredient list",
  },
};

const CHROME: Record<
  SeoLocale,
  {
    guides: string;
    minutes: string;
    author: string;
    review: string;
    sources: string;
    toc: string;
    styles: string;
    articles: string;
    tryOn: string;
    missing: string;
  }
> = {
  uz: {
    guides: "Qo'llanmalar",
    minutes: "daqiqa",
    author: "Muallif",
    review: "Tahrir",
    sources: "Manbalar",
    toc: "Mundarija",
    styles: "Bog'liq uslublar",
    articles: "Bog'liq maqolalar",
    tryOn: "Sinash",
    missing: "Maqola topilmadi",
  },
  ru: {
    guides: "Руководства",
    minutes: "мин",
    author: "Автор",
    review: "Редакция",
    sources: "Источники",
    toc: "Содержание",
    styles: "Похожие модели",
    articles: "Другие статьи",
    tryOn: "Примерить",
    missing: "Статья не найдена",
  },
  en: {
    guides: "Guides",
    minutes: "min",
    author: "Author",
    review: "Reviewed by",
    sources: "Sources",
    toc: "Contents",
    styles: "Related haircuts",
    articles: "Related articles",
    tryOn: "Try on",
    missing: "Article not found",
  },
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function syncGuideDocumentHead(article: GuideArticle, locale: SeoLocale) {
  const title = article.seo_title || article.title;
  const description = article.meta_description || article.excerpt || title;
  const canonical = `${SITE_ORIGIN}${localizedPath(`/guides/${article.slug}`, locale)}`;
  const published = (article.published_locales ?? []).filter(
    (item): item is SeoLocale => item === "uz" || item === "ru" || item === "en",
  );
  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:type", "article");
  upsertMeta("property", "og:url", canonical);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  if (article.cover_image_url) {
    upsertMeta("property", "og:image", article.cover_image_url);
    upsertMeta("name", "twitter:image", article.cover_image_url);
    if (article.cover_alt) upsertMeta("property", "og:image:alt", article.cover_alt);
    if (article.cover_width) upsertMeta("property", "og:image:width", String(article.cover_width));
    if (article.cover_height)
      upsertMeta("property", "og:image:height", String(article.cover_height));
  }
  upsertMeta("name", "robots", published.length ? "index, follow" : "noindex, nofollow");
  let canonicalLink = document.head.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement("link");
    canonicalLink.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute("href", canonical);
  document.head.querySelectorAll('link[data-guide-alternate="1"]').forEach((node) => node.remove());
  const alternates = published.length
    ? [
        ...published.map((item) => ({
          hrefLang: item,
          href: `${SITE_ORIGIN}${localizedPath(`/guides/${article.slug}`, item)}`,
        })),
        {
          hrefLang: "x-default",
          href: `${SITE_ORIGIN}${localizedPath(
            `/guides/${article.slug}`,
            published.includes("uz") ? "uz" : published[0]!,
          )}`,
        },
      ]
    : [];
  for (const alt of alternates) {
    const link = document.createElement("link");
    link.rel = "alternate";
    link.hreflang = alt.hrefLang;
    link.href = alt.href;
    link.dataset.guideAlternate = "1";
    document.head.appendChild(link);
  }
}

function previewQuery(): string {
  return import.meta.env.DEV ? "&preview=1" : "";
}

async function fetchGuide(slug: string, locale: SeoLocale): Promise<GuideArticle | null> {
  const res = await fetch(
    `${resolveFetchBase("")}/api/v1/content/articles/${encodeURIComponent(slug)}/?locale=${locale}${previewQuery()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return null;
  return (await res.json()) as GuideArticle;
}

async function fetchStyleCard(id: string): Promise<StyleCard | null> {
  const res = await fetch(`${resolveFetchBase("")}/api/v1/hairstyles/${encodeURIComponent(id)}/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return { id, title: id, image: "" };
  const row = (await res.json()) as {
    id?: string;
    title?: string;
    title_uz?: string;
    image_url?: string;
  };
  const image = row.image_url?.trim() || "";
  return {
    id: row.id || id,
    title: row.title_uz?.trim() || row.title?.trim() || id,
    image: image.startsWith("http") ? image : image,
  };
}

function articleHref(href: string, locale: SeoLocale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const localized =
    href === "/guides" ||
    href.startsWith("/guides/") ||
    href === "/morf-ai" ||
    href.startsWith("/morf-ai/");
  return localized ? localizedPath(href, locale) : href;
}

function InlineText({ parts, locale }: { parts: Inline[]; locale: SeoLocale }) {
  const router = useRouter();
  return (
    <>
      {parts.map((part, index) => {
        if (part.kind === "strong") return <strong key={index}>{part.text}</strong>;
        if (part.kind === "link") {
          const href = articleHref(part.href, locale);
          return (
            <a
              key={index}
              href={href}
              className="underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
              onClick={(event) => {
                if (!href.startsWith("/") || event.metaKey || event.ctrlKey) return;
                event.preventDefault();
                void router.navigate({ href });
              }}
            >
              {part.text}
            </a>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
}

export function GuideArticlePage({ slug, locale }: { slug: string; locale: SeoLocale }) {
  const chrome = CHROME[locale];
  const router = useRouter();
  const articleQuery = useQuery({
    queryKey: ["guide", locale, slug, import.meta.env.DEV ? "preview" : "live"],
    queryFn: () => fetchGuide(slug, locale),
  });
  const article = articleQuery.data;
  const styleQuery = useQuery({
    queryKey: ["guide-styles", article?.related_style_ids ?? []],
    enabled: Boolean(article?.related_style_ids?.length),
    queryFn: async () => {
      const cards = await Promise.all((article?.related_style_ids ?? []).map(fetchStyleCard));
      return cards.filter((card): card is StyleCard => Boolean(card));
    },
  });

  useEffect(() => {
    if (!article) return;
    syncGuideDocumentHead(article, locale);
    trackEvent(
      "blog_article_view",
      { slug, locale, surface: "guides" },
      { dedupeKey: `guide-${locale}-${slug}` },
    );
  }, [article, locale, slug]);

  if (articleQuery.isLoading) {
    return <div className="px-4 py-10 text-sm text-muted-foreground">…</div>;
  }
  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader
          title={chrome.guides}
          showBack
          sticky
          backFallback={localizedPath("/guides", locale)}
        />
        <p className="mt-6 text-sm text-muted-foreground">{chrome.missing}</p>
      </div>
    );
  }

  const blocks = parseArticleMarkdown(article.content || "");
  const toc = tableOfContents(blocks);
  const showToc = toc.filter((item) => item.level === 2).length >= 3;
  const minutes = readingMinutes(article.content || article.excerpt || "");
  const ctaHref = article.conversion_cta_href || "/ai-style";
  const ctaEvent = (article.conversion_event || "blog_article_view") as AnalyticsEventName;

  const openCta = () => {
    if (ctaEvent === "tryon_cta_click" || ctaEvent === "scan_cta_click") {
      trackEvent(
        ctaEvent,
        { slug, locale, surface: "guide_cta" },
        { dedupeKey: `cta-${locale}-${slug}` },
      );
    }
  };

  return (
    <article className="mx-auto w-full max-w-5xl px-4 pb-16 pt-2 md:px-6">
      <PageHeader showBack sticky backFallback={localizedPath("/guides", locale)} />
      <nav className="mt-3 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">
          MySaloon
        </Link>
        <span className="px-1.5">/</span>
        <a href={localizedPath("/guides", locale)} className="hover:text-foreground">
          {chrome.guides}
        </a>
        <span className="px-1.5">/</span>
        <span className="text-foreground">{article.title}</span>
      </nav>

      {article.category ? (
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {article.category}
        </p>
      ) : null}
      <h1 className="mt-3 max-w-[40rem] font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-tight">
        {article.title}
      </h1>
      {article.excerpt ? (
        <p className="mt-4 max-w-[40rem] text-lg leading-8 text-muted-foreground">
          {article.excerpt}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-muted-foreground">
        <span>
          {chrome.author}: {article.author || "MySaloon"}
        </span>
        <span className="px-2">·</span>
        <span>
          {minutes} {chrome.minutes}
        </span>
      </p>

      {article.cover_image_url ? (
        <figure className="mt-8 max-w-[40rem] overflow-hidden rounded-2xl bg-surface">
          <img
            src={article.cover_image_url}
            alt={article.cover_alt || article.title}
            width={article.cover_width || undefined}
            height={article.cover_height || undefined}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="h-auto w-full object-cover"
          />
        </figure>
      ) : null}

      <div
        className={
          showToc
            ? "mt-10 lg:grid lg:grid-cols-[minmax(0,40rem)_16rem] lg:items-start lg:gap-12"
            : "mt-10"
        }
      >
        <div className="max-w-[40rem]">
          {blocks.map((block, index) => {
            if (block.type === "h2") {
              return (
                <h2
                  key={block.id}
                  id={block.id}
                  className="mt-10 font-display text-2xl font-semibold tracking-tight"
                >
                  {block.text}
                </h2>
              );
            }
            if (block.type === "h3") {
              return (
                <h3
                  key={`${block.id}-${index}`}
                  id={block.id}
                  className="mt-6 text-lg font-semibold"
                >
                  {block.text}
                </h3>
              );
            }
            if (block.type === "ul") {
              return (
                <ul key={index} className="mt-4 list-disc space-y-2 pl-5 text-[17px] leading-8">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <InlineText parts={item} locale={locale} />
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={index} className="mt-4 text-[17px] leading-8 text-foreground">
                <InlineText parts={block.inlines} locale={locale} />
              </p>
            );
          })}

          <aside className="mt-12 rounded-2xl border border-border bg-surface px-5 py-6">
            <p className="text-base leading-7 text-foreground">{article.excerpt}</p>
            <a
              href={ctaHref}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background"
              onClick={(event) => {
                openCta();
                if (!ctaHref.startsWith("/") || event.metaKey || event.ctrlKey) return;
                event.preventDefault();
                void router.navigate({ href: ctaHref });
              }}
            >
              {article.conversion_cta_label}
            </a>
          </aside>

          <footer className="mt-10 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
            <p>
              {chrome.author}: {article.author || "MySaloon"}
            </p>
            {article.reviewed_by ? (
              <p>
                {chrome.review}: {article.reviewed_by}
              </p>
            ) : null}
            {article.sources?.length ? (
              <div className="mt-4">
                <p className="font-semibold text-foreground">{chrome.sources}</p>
                <ul className="mt-2 space-y-1">
                  {article.sources.map((source) =>
                    source.url ? (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          className="underline underline-offset-4"
                          rel="noopener noreferrer"
                        >
                          {source.title || source.url}
                        </a>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            ) : null}
          </footer>
        </div>

        {showToc ? (
          <nav className="md:sticky md:top-24 md:self-start" aria-label={chrome.toc}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {chrome.toc}
            </p>
            <ol className="mt-3 space-y-2 border-l border-border pl-3 text-sm">
              {toc.map((item) => (
                <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
                  <a href={`#${item.id}`} className="text-muted-foreground hover:text-foreground">
                    {item.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
      </div>

      {styleQuery.data?.length ? (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold">{chrome.styles}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {styleQuery.data.map((style) => (
              <li key={style.id} className="overflow-hidden rounded-2xl border border-border">
                <Link to="/explore/$styleId" params={{ styleId: style.id }} className="block">
                  {style.image ? (
                    <img
                      src={style.image.startsWith("/") ? style.image : style.image}
                      alt={style.title}
                      width={768}
                      height={1024}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : null}
                  <span className="block px-3 py-3 text-sm font-semibold">{style.title}</span>
                </Link>
                <Link
                  to="/explore/$styleId/try"
                  params={{ styleId: style.id }}
                  className="block px-3 pb-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  {chrome.tryOn}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {article.related_slugs?.length ? (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">{chrome.articles}</h2>
          <ul className="mt-4 space-y-2">
            {article.related_slugs.map((related) => (
              <li key={related}>
                <a
                  href={localizedPath(`/guides/${related}`, locale)}
                  className="text-base underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey) return;
                    event.preventDefault();
                    void router.navigate({ href: localizedPath(`/guides/${related}`, locale) });
                  }}
                >
                  {RELATED_TITLE[related]?.[locale] || related}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
