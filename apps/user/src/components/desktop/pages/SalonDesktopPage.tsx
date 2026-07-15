import { Heart, MapPin, Share2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { filterSalonCatalogServices } from "@/lib/salon-services";
import { scrollToSalonSection } from "@/lib/salon-scroll";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import { SalonBookingAside } from "@/components/salon/SalonBookingAside";
import { SalonHeroGallery } from "@/components/salon/SalonHeroGallery";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { SalonSectionNav } from "@/components/salon/SalonSectionNav";
import { cn } from "@/lib/utils";

export function SalonDesktopPage({
  salon,
  fav,
  onToggleFav,
  onShare,
  favPending = false,
  reviewsAreMock = false,
}: {
  salon: Salon;
  fav: boolean;
  onToggleFav: () => void;
  onShare?: () => void;
  favPending?: boolean;
  reviewsAreMock?: boolean;
}) {
  const { t } = useTranslation();
  const ownerServiceCount = filterSalonCatalogServices(salon.services).length;

  return (
    <div className="w-full">
      <div className="relative h-[min(56vh,560px)] w-full overflow-hidden bg-muted">
        <div className="absolute inset-0 [&_>div]:h-full [&_>div]:rounded-none">
          <SalonHeroGallery salon={salon} variant="desktop" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        <div className={cn("absolute inset-x-0 bottom-0 pb-8 pt-16", DESKTOP_BAZAAR_INSET)}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {salon.category}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-4xl font-semibold tracking-tight text-white xl:text-5xl">
                {salon.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/90">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Star className="h-4 w-4 fill-white" />
                  {salon.rating.toFixed(1)}
                  <span className="font-normal text-white/70">
                    ({salon.reviewCount} {t("home.reviews", { defaultValue: "sharh" })})
                  </span>
                </span>
                {salon.distanceKm > 0 ? (
                  <>
                    <span className="text-white/50">·</span>
                    <span>{salon.distanceKm} km</span>
                  </>
                ) : null}
              </div>
              <p className="mt-2 flex items-start gap-2 text-sm text-white/80">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{salon.address}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void onShare?.()}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                aria-label={t("salon.share", { defaultValue: "Ulashish" })}
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onToggleFav}
                disabled={favPending}
                aria-pressed={fav}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25",
                  favPending && "opacity-60",
                )}
                aria-label={t("favorites.title", { defaultValue: "Sevimli salonlar" })}
              >
                <Heart className={cn("h-4 w-4", fav && "fill-white")} />
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {ownerServiceCount > 0 ? (
              <button
                type="button"
                onClick={() => scrollToSalonSection("services")}
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                {ownerServiceCount} {t("salon.tabs.services").toLowerCase()}
              </button>
            ) : null}
            {salon.staff.length > 0 ? (
              <button
                type="button"
                onClick={() => scrollToSalonSection("staff")}
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                {salon.staff.length} {t("salon.tabs.staff").toLowerCase()}
              </button>
            ) : null}
            {salon.amenities.length > 0 ? (
              <button
                type="button"
                onClick={() => scrollToSalonSection("amenities")}
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                {salon.amenities.length}{" "}
                {t("salon.nav.amenities", { defaultValue: "Mijozlar uchun" })}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn(DESKTOP_BAZAAR_INSET, "pb-20")}>
        <SalonSectionNav salon={salon} />
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-14">
          <SalonPageSections salon={salon} showCalendar={false} reviewsAreMock={reviewsAreMock} />
          <SalonBookingAside salon={salon} className="sticky top-36" />
        </div>
      </div>
    </div>
  );
}
