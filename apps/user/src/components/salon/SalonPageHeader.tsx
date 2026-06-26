import { Heart, MapPin, Share2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { formatPrice } from "@/lib/mock-data";
import { filterSalonOwnerServices } from "@/lib/salon-services";
import { cn } from "@/lib/utils";

export function SalonPageHeader({
  salon,
  fav,
  onToggleFav,
  onShare,
  favPending = false,
  variant = "desktop",
}: {
  salon: Salon;
  fav: boolean;
  onToggleFav: () => void;
  onShare?: () => void;
  favPending?: boolean;
  variant?: "desktop" | "mobile";
}) {
  const { t } = useTranslation();
  const isMobile = variant === "mobile";
  const ownerServiceCount = filterSalonOwnerServices(salon.services, salon.ownerId).length;

  return (
    <div
      className={cn(
        isMobile
          ? "rounded-2xl border border-border bg-background p-5 shadow-sm"
          : "border-b border-border pb-6 pt-8",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {salon.category}
          </p>
          <h1
            className={cn(
              "mt-1 font-semibold tracking-tight text-foreground",
              isMobile ? "text-2xl" : "text-[32px] leading-tight",
            )}
          >
            {salon.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star className="h-4 w-4 fill-foreground" />
              {salon.rating.toFixed(1)}
              <span className="font-normal text-muted-foreground">
                ({salon.reviewCount} {t("home.reviews", { defaultValue: "sharh" })})
              </span>
            </span>
            {salon.distanceKm > 0 ? (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{salon.distanceKm} km</span>
              </>
            ) : null}
          </div>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{salon.address}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onShare?.()}
            className="grid h-10 w-10 place-items-center rounded-full border border-border transition-colors hover:bg-muted"
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
              "grid h-10 w-10 place-items-center rounded-full border border-border transition-colors hover:bg-muted",
              favPending && "opacity-60",
            )}
            aria-label={t("favorites.title", { defaultValue: "Sevimli salonlar" })}
          >
            <Heart className={cn("h-4 w-4", fav && "fill-foreground")} />
          </button>
        </div>
      </div>

      {!isMobile ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {salon.priceFrom > 0 ? (
            <span className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold">
              {t("salon.fromPrice", { defaultValue: "{{price}} dan", price: formatPrice(salon.priceFrom) })}
            </span>
          ) : null}
          {ownerServiceCount > 0 ? (
            <span className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
              {ownerServiceCount} {t("salon.tabs.services").toLowerCase()}
            </span>
          ) : null}
          {salon.staff.length > 0 ? (
            <span className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
              {salon.staff.length} {t("salon.tabs.staff").toLowerCase()}
            </span>
          ) : null}
          {salon.amenities.length > 0 ? (
            <span className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
              {salon.amenities.length} {t("salon.nav.amenities", { defaultValue: "qulaylik" })}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-lg font-bold tabular-nums">
          {formatPrice(salon.priceFrom)}+
        </p>
      )}
    </div>
  );
}
