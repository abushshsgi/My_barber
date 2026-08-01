import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { MapPin, ScanFace } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ExploreStyleGallery } from "@/components/explore/ExploreStyleGallery";
import { HairstylePreviewFrame } from "@/components/hairstyles/HairstylePreviewImage";
import { MobileStickyActionBar } from "@/components/mobile/MobileStickyActionBar";
import { PageHeader } from "@/components/PageHeader";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyle } from "@/hooks/use-hairstyles";
import { MOBILE_STICKY_CONTENT_PADDING_NO_DOCK_CLASS } from "@/lib/layout-constants";
import { getHairstyleDisplayUrl, type HairstyleEntry, type HairstyleGalleryItem } from "@/lib/hairstyles/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore_/$styleId")({
  head: () => ({ meta: [{ title: "Uslub — mysaloon.uz" }] }),
  component: ExploreStyleDetailPage,
});

const ctaPrimaryClass =
  "inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-3 py-3 text-[13px] font-bold text-background transition-opacity active:opacity-90 sm:gap-2 sm:text-sm";
const ctaSecondaryClass =
  "inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-3 text-[13px] font-bold text-foreground transition-opacity active:opacity-90 sm:gap-2 sm:text-sm";
const ctaDesktopPrimaryClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90";
const ctaDesktopSecondaryClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition-opacity hover:opacity-90";

type StyleProps = {
  entry: HairstyleEntry;
  galleryItems: HairstyleGalleryItem[];
};

function ExploreStyleMobile({ entry, galleryItems }: StyleProps) {
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

function ExploreStyleDesktop({ entry, galleryItems }: StyleProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-10 pt-2">
      <div className="min-w-0">
        <HairstylePreviewFrame>
          <ExploreStyleGallery items={galleryItems} title={entry.titleUz} />
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
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.descriptionUz}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            to="/explore/$styleId/try"
            params={{ styleId: entry.id }}
            className={ctaDesktopPrimaryClass}
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

function ExploreStyleDetailPage() {
  const { t } = useTranslation();
  const { styleId } = Route.useParams();
  const { personaId } = useExplorePersona();
  const { data: entry, isLoading, isError } = useHairstyle(styleId, personaId);

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

  const imageUrl = getHairstyleDisplayUrl(entry);
  const galleryItems = entry.gallery.length > 0 ? entry.gallery : [{ view: "front", label: "Old", url: imageUrl }];

  return (
    <>
      <div className={cn(MOBILE_STICKY_CONTENT_PADDING_NO_DOCK_CLASS, "min-w-0 lg:px-6 lg:pb-10")}>
        <DesktopPageSplit
          mobile={<ExploreStyleMobile entry={entry} galleryItems={galleryItems} />}
          desktop={<ExploreStyleDesktop entry={entry} galleryItems={galleryItems} />}
        />
      </div>

      <MobileStickyActionBar>
        <Link to="/explore/$styleId/try" params={{ styleId: entry.id }} className={ctaPrimaryClass}>
          <ScanFace className="h-4 w-4 shrink-0" strokeWidth={2.25} />
          <span className="min-w-0 truncate">{t("explorePage.tryOnMe")}</span>
        </Link>
        <Link to="/map" className={ctaSecondaryClass}>
          <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.25} />
          <span className="min-w-0 truncate">{t("explorePage.findSalon")}</span>
        </Link>
      </MobileStickyActionBar>
    </>
  );
}
