import { SalonBookingAside } from "@/components/salon/SalonBookingAside";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { SalonSectionNav } from "@/components/salon/SalonSectionNav";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { resolveMediaUrl } from "@/lib/media-url";
import { Heart, MapPin, Share2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { filterSalonCatalogServices } from "@/lib/salon-services";
import { scrollToSalonSection } from "@/lib/salon-scroll";
import { cn } from "@/lib/utils";
import type { SalonDesktopPageProps } from "./types";

/** Layout 4: katta hero banner, matn ustida — editorial uslub. */
export function SalonDesktopLayout4Editorial(props: SalonDesktopPageProps) {
  const { salon, fav, onToggleFav, onShare, favPending, reviewsAreMock } = props;
  const { t } = useTranslation();
  const cover =
    (salon.coverUrl ? resolveMediaUrl(salon.coverUrl) ?? salon.coverUrl : null) ??
    getSalonCoverUrl(salon.coverSeed, salon.category);
  const ownerServiceCount = filterSalonCatalogServices(salon.services).length;

  return (
    <div className="pb-16">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl">
        <div className="relative h-[min(480px,50vh)]">
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              {salon.category}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{salon.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star className="h-4 w-4 fill-white" />
                {salon.rating.toFixed(1)}
              </span>
              <span className="text-white/70">·</span>
              <span className="inline-flex items-center gap-1.5 text-white/85">
                <MapPin className="h-4 w-4" />
                {salon.address}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {ownerServiceCount > 0 ? (
                <button
                  type="button"
                  onClick={() => scrollToSalonSection("services")}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  {ownerServiceCount} {t("salon.tabs.services").toLowerCase()}
                </button>
              ) : null}
              {salon.staff.length > 0 ? (
                <button
                  type="button"
                  onClick={() => scrollToSalonSection("staff")}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  {salon.staff.length} {t("salon.tabs.staff").toLowerCase()}
                </button>
              ) : null}
              {salon.amenities.length > 0 ? (
                <button
                  type="button"
                  onClick={() => scrollToSalonSection("amenities")}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  {salon.amenities.length} {t("salon.nav.amenities", { defaultValue: "Mijozlar uchun" })}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void onShare?.()}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur-sm transition-colors hover:bg-white/25"
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
                  "grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur-sm transition-colors hover:bg-white/25",
                  favPending && "opacity-60",
                )}
                aria-label={t("favorites.title", { defaultValue: "Sevimli salonlar" })}
              >
                <Heart className={cn("h-4 w-4", fav && "fill-white")} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        <SalonSectionNav salon={salon} />
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_340px] items-start gap-10 xl:gap-14">
          <SalonPageSections salon={salon} showCalendar={false} reviewsAreMock={reviewsAreMock} />
          <SalonBookingAside salon={salon} className="sticky top-36" />
        </div>
      </div>
    </div>
  );
}
