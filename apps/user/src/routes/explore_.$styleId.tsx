import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ScanFace } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/lib/analytics";
import { resolveFetchBase } from "@/lib/api/base-url";
import { ExploreStyleGallery } from "@/components/explore/ExploreStyleGallery";
import { HairstylePreviewFrame } from "@/components/hairstyles/HairstylePreviewImage";
import { MobileStickyActionBar } from "@/components/mobile/MobileStickyActionBar";
import { PageHeader } from "@/components/PageHeader";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useIsMdUp } from "@/hooks/use-mobile";
import { useHairstyle, useHairstyles } from "@/hooks/use-hairstyles";
import { lengthCategoryPath, rankRelatedHairstyles } from "@/lib/related-hairstyles";
import { localizedPath } from "@/seo/url";
import type { SeoLocale } from "@/seo/constants";
import { MOBILE_STICKY_CONTENT_PADDING_NO_DOCK_CLASS } from "@/lib/layout-constants";
import {
  getHairstyleDisplayUrl,
  type HairstyleEntry,
  type HairstyleGalleryItem,
} from "@/lib/hairstyles/catalog";
import { cn } from "@/lib/utils";
import { fetchExploreStyleSeo } from "@/lib/hairstyle-seo.server";
import { buildHairstyleImageSeo, exploreDocumentTitle } from "@/seo/hairstyles/image-seo";

export const Route = createFileRoute("/explore_/$styleId")({
  loader: async ({ params }) => {
    const pack = await fetchExploreStyleSeo(params.styleId);
    return { seoTitle: exploreDocumentTitle(params.styleId, pack?.title) };
  },
  head: ({ loaderData, params }) => ({
    meta: [{ title: loaderData?.seoTitle ?? exploreDocumentTitle(params.styleId, null) }],
  }),
  component: ExploreStyleDetailPage,
});

const ctaPrimaryClass =
  "inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-bold leading-tight text-background transition-opacity active:opacity-90";
const ctaSecondaryClass =
  "inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-3 text-[13px] font-bold text-foreground transition-opacity active:opacity-90 sm:gap-2 sm:text-sm";
const ctaDesktopPrimaryClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90";
const ctaDesktopSecondaryClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition-opacity hover:opacity-90";

type StyleProps = {
  entry: HairstyleEntry;
  galleryItems: HairstyleGalleryItem[];
  imageAlt: string;
};

function ExploreStyleMobile({ entry, galleryItems, imageAlt }: StyleProps) {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader showBack sticky title={entry.titleUz} backFallback="/explore" />
      <div className="px-4 pb-3 pt-1">
        <ExploreStyleGallery
          items={galleryItems}
          title={entry.titleUz}
          variant="mobileHero"
          showThumbs
          autoPlay={false}
          description={entry.descriptionUz}
          priority
          primaryAlt={imageAlt}
        />

        {entry.faceShapes.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {entry.faceShapes.slice(0, 4).map((shape) => (
              <span
                key={shape}
                className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
              >
                {t(`aiStylePage.faceShapes.${shape}`)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExploreStyleDesktop({ entry, galleryItems, imageAlt }: StyleProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-10 pt-2">
      <div className="min-w-0">
        <HairstylePreviewFrame>
          <ExploreStyleGallery items={galleryItems} title={entry.titleUz} primaryAlt={imageAlt} />
        </HairstylePreviewFrame>

        {entry.faceShapes.length > 0 || entry.hairLength ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.faceShapes.map((shape) => (
              <span
                key={shape}
                className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-foreground"
              >
                {t(`aiStylePage.faceShapes.${shape}`)}
              </span>
            ))}
            <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-foreground">
              {t(`aiStylePage.hairTypes.${entry.hairLength}`)}
            </span>
          </div>
        ) : null}
      </div>

      <aside className="sticky top-20 self-start rounded-3xl border border-border bg-surface/60 p-5">
        <h1 className="text-2xl font-bold tracking-tight">{entry.titleUz}</h1>
        {entry.descriptionUz ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {entry.descriptionUz}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            to="/explore/$styleId/try"
            params={{ styleId: entry.id }}
            className={ctaDesktopPrimaryClass}
            onClick={() =>
              trackEvent(
                "tryon_cta_click",
                { style_id: entry.id, surface: "explore_detail" },
                { dedupeKey: `tryon-${entry.id}` },
              )
            }
          >
            <ScanFace className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            {t("explorePage.tryOnMe")}
          </Link>
          <Link to="/map" className={ctaDesktopSecondaryClass}>
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            {t("explorePage.findSalon")}
          </Link>
        </div>
      </aside>
    </div>
  );
}

function articleLocale(language: string): SeoLocale {
  if (language.startsWith("ru")) return "ru";
  if (language.startsWith("en")) return "en";
  return "uz";
}

function ExploreStyleDetailPage() {
  const { t, i18n } = useTranslation();
  const { styleId } = Route.useParams();
  const { personaId } = useExplorePersona();
  const isMdUp = useIsMdUp();
  const { data: entry, isLoading, isError } = useHairstyle(styleId, personaId);
  const catalog = useHairstyles(entry?.audience, personaId, {
    ignoreAgeGroup: true,
    enabled: Boolean(entry),
  });
  const locale = articleLocale(i18n.language || "uz");
  const guides = useQuery({
    queryKey: ["guides", locale, "published", "style-links"],
    enabled: Boolean(entry),
    queryFn: async () => {
      const res = await fetch(`${resolveFetchBase("")}/api/v1/content/articles/?locale=${locale}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      return (await res.json()) as Array<{
        slug: string;
        title: string;
        related_style_ids?: string[];
      }>;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!entry) return;
    trackEvent(
      "hairstyle_model_view",
      { style_id: entry.id, slug: entry.slug },
      { dedupeKey: entry.id },
    );
  }, [entry?.id, entry?.slug]);

  if (isLoading) {
    return (
      <div className="pb-10">
        <PageHeader showBack sticky title={t("explorePage.title")} backFallback="/explore" />
        <p className="mt-8 px-5 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (isError || !entry) {
    throw notFound();
  }

  const imageSeo = buildHairstyleImageSeo({
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    title_uz: entry.titleUz,
    audience: entry.audience,
    hair_length: entry.hairLength,
    image_url: entry.imageUrl,
    description_uz: entry.descriptionUz,
    tags: entry.tags,
  });

  const imageUrl = getHairstyleDisplayUrl(entry);
  const galleryItems =
    entry.gallery.length > 0 ? entry.gallery : [{ view: "front", label: "Old", url: imageUrl }];
  const related = rankRelatedHairstyles(
    {
      id: entry.id,
      category: entry.category,
      hairLength: entry.hairLength,
      audience: entry.audience,
      tags: entry.tags,
    },
    (catalog.data ?? []).map((item) => ({
      id: item.id,
      category: item.category,
      hairLength: item.hairLength,
      audience: item.audience,
      tags: item.tags,
      entry: item,
    })),
  ).map((item) => item.entry);
  const lengthPath = lengthCategoryPath(entry.hairLength);
  const relatedGuides = (guides.data ?? []).filter((row) =>
    (row.related_style_ids ?? []).includes(entry.id),
  );

  return (
    <>
      <div className={cn(MOBILE_STICKY_CONTENT_PADDING_NO_DOCK_CLASS, "min-w-0 md:px-6 md:pb-10")}>
        {isMdUp ? (
          <ExploreStyleDesktop
            entry={entry}
            galleryItems={galleryItems}
            imageAlt={imageSeo.alt.uz}
          />
        ) : (
          <ExploreStyleMobile
            entry={entry}
            galleryItems={galleryItems}
            imageAlt={imageSeo.alt.uz}
          />
        )}
        {related.length || lengthPath || relatedGuides.length ? (
          <section className="mt-8 px-4 md:px-0">
            {lengthPath ? (
              <a
                href={lengthPath}
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("explorePage.browseLength")}
              </a>
            ) : null}
            {related.length ? (
              <>
                <h2 className="mt-4 font-display text-xl font-semibold">
                  {t("explorePage.relatedStyles")}
                </h2>
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link to="/explore/$styleId" params={{ styleId: item.id }} className="block">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.titleUz}
                            width={768}
                            height={1024}
                            loading="lazy"
                            decoding="async"
                            className="aspect-[3/4] w-full rounded-2xl object-cover"
                          />
                        ) : null}
                        <span className="mt-2 block text-sm font-semibold">{item.titleUz}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {relatedGuides.length ? (
              <>
                <h2 className="mt-8 font-display text-xl font-semibold">
                  {t("explorePage.relatedGuides")}
                </h2>
                <ul className="mt-3 space-y-2">
                  {relatedGuides.map((row) => (
                    <li key={row.slug}>
                      <a
                        href={localizedPath(`/guides/${row.slug}`, locale)}
                        className="text-sm underline-offset-4 hover:underline"
                      >
                        {row.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}
      </div>

      {isMdUp ? null : (
        <MobileStickyActionBar>
          <Link
            to="/explore/$styleId/try"
            params={{ styleId: entry.id }}
            className={ctaPrimaryClass}
            onClick={() =>
              trackEvent("tryon_cta_click", { style_id: entry.id, surface: "explore_detail" })
            }
          >
            <ScanFace className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            <span className="min-w-0 text-center leading-tight">{t("explorePage.tryOnMe")}</span>
          </Link>
          <Link to="/map" className={ctaSecondaryClass}>
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            <span className="min-w-0 truncate">{t("explorePage.findSalon")}</span>
          </Link>
        </MobileStickyActionBar>
      )}
    </>
  );
}
