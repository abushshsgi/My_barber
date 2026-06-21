import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Heart, MapPin, Share2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { SalonDesktopPage } from "@/components/desktop/pages/SalonDesktopPage";
import { formatPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { PageHeader } from "@/components/PageHeader";
import { useFavorites } from "@/hooks/use-favorites";
import { useSalonPage } from "@/hooks/use-salon-page";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salon/$id")({
  head: () => ({ meta: [{ title: "Salon — mysaloon.uz" }] }),
  component: SalonPage,
});

function SalonMobile({
  salon,
  fav,
  onToggleFav,
}: {
  salon: NonNullable<ReturnType<typeof useSalonPage>["salon"]>;
  fav: boolean;
  onToggleFav: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="pb-32">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <img
          src={salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
        <div className="absolute inset-x-0 top-0">
          <PageHeader
            showBack
            transparent
            right={
              <>
                <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-background/90 backdrop-blur">
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onToggleFav}
                  className="grid h-10 w-10 place-items-center rounded-full bg-background/90 backdrop-blur"
                >
                  <Heart className={cn("h-4 w-4", fav && "fill-foreground")} strokeWidth={2} />
                </button>
              </>
            }
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 text-background">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{salon.category}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{salon.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-background" />
              {salon.rating} ({salon.reviewCount})
            </span>
            <span className="opacity-50">·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {salon.distanceKm} km
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6">
        <SalonPageSections salon={salon} calendarMonths={1} />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-md"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="mx-auto flex max-w-[480px] items-center justify-center rounded-2xl bg-foreground py-4 text-sm font-bold text-background"
        >
          {t("salon.bookNow")} · {formatPrice(salon.priceFrom)}+
        </Link>
      </div>
    </div>
  );
}

function SalonPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/salon/$id" });
  const { salon, isLoading } = useSalonPage(id);
  const { isFav, toggle } = useFavorites();

  if (isLoading || !salon) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const fav = isFav(salon.id);

  return (
    <DesktopPageSplit
      mobile={<SalonMobile salon={salon} fav={fav} onToggleFav={() => toggle(salon.id)} />}
      desktop={<SalonDesktopPage salon={salon} fav={fav} onToggleFav={() => toggle(salon.id)} />}
    />
  );
}
