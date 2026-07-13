import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { MapPin, ScanFace } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ExploreStyleGallery } from "@/components/explore/ExploreStyleGallery";
import { HairstylePreviewFrame } from "@/components/hairstyles/HairstylePreviewImage";
import { PageHeader } from "@/components/PageHeader";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyle } from "@/hooks/use-hairstyles";
import { getHairstyleDisplayUrl } from "@/lib/hairstyles/catalog";
import { cn } from "@/lib/utils";

/** Pastki CTA balandligi — dock yo'q sahifa (explore detail). */
const ACTIONS_OFFSET = "calc(5.5rem + env(safe-area-inset-bottom, 0px))";

export const Route = createFileRoute("/explore_/$styleId")({
  head: () => ({ meta: [{ title: "Uslub — mysaloon.uz" }] }),
  component: ExploreStyleDetailPage,
});

function ExploreStyleDetailPage() {
  const { t } = useTranslation();
  const { styleId } = Route.useParams();
  const { personaId } = useExplorePersona();
  const { data: entry, isLoading, isError } = useHairstyle(styleId, personaId);

  if (isLoading) {
    return (
      <div className="pb-10">
        <PageHeader showBack title={t("explorePage.title")} />
        <p className="mt-8 px-5 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (isError || !entry) {
    throw notFound();
  }

  const imageUrl = getHairstyleDisplayUrl(entry);
  const galleryItems = entry.gallery.length > 0 ? entry.gallery : [{ view: "front", label: "Old", url: imageUrl }];

  return (
    <div
      className="pb-[var(--explore-style-actions-offset)] lg:px-6 lg:pb-8"
      style={{ ["--explore-style-actions-offset" as string]: ACTIONS_OFFSET }}
    >
      {/* Mobile */}
      <div className="lg:hidden">
        <PageHeader showBack title={entry.titleUz} className="px-4" />
        <div className="px-4 pb-2">
          <ExploreStyleGallery
            items={galleryItems}
            title={entry.titleUz}
            variant="mobileHero"
            showThumbs
            autoPlay={false}
            description={entry.descriptionUz}
          />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8 lg:pt-4">
        <div className="lg:px-0">
          <h2 className="text-lg font-bold tracking-tight">{t("aiStylePage.uploadTitle")}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("explorePage.tryOnDesc")}</p>

          <HairstylePreviewFrame className="mt-4">
            <ExploreStyleGallery
              items={galleryItems}
              title={entry.titleUz}
              badge={
                <span className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm">
                  {t("explorePage.sampleBadge")}
                </span>
              }
            />
            <div className="mt-3 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
              <div className="border-t border-border/70 bg-surface px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("styleTryOnPage.selectedStyle")}
                </p>
                <p className="mt-0.5 text-base font-bold leading-tight">{entry.titleUz}</p>
              </div>
            </div>
          </HairstylePreviewFrame>

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

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{entry.descriptionUz}</p>

          {entry.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="sticky top-20 block self-start">
          <h2 className="text-xl font-bold tracking-tight">{entry.titleUz}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{entry.descriptionUz}</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Link
              to="/explore/$styleId/try"
              params={{ styleId: entry.id }}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-xs font-bold text-background"
            >
              <ScanFace className="h-4 w-4" />
              {t("explorePage.tryOnMe")}
            </Link>
            <Link
              to="/"
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background py-3.5 text-xs font-bold text-foreground"
            >
              <MapPin className="h-4 w-4" />
              {t("explorePage.findSalon")}
            </Link>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden",
        )}
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto flex max-w-md gap-2.5">
          <Link
            to="/explore/$styleId/try"
            params={{ styleId: entry.id }}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground px-3 py-3.5 text-[13px] font-bold text-background shadow-sm transition active:scale-[0.98] active:opacity-90"
          >
            <ScanFace className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} />
            <span className="truncate">{t("explorePage.tryOnMe")}</span>
          </Link>
          <Link
            to="/"
            className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-3.5 text-[13px] font-bold text-foreground shadow-sm transition active:scale-[0.98] active:opacity-90"
          >
            <MapPin className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} />
            <span className="truncate">{t("explorePage.findSalon")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
