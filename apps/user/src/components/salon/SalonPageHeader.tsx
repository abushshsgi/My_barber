import { Heart, MapPin, Share2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { filterSalonCatalogServices } from "@/lib/salon-services";
import { scrollToSalonSection } from "@/lib/salon-scroll";
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
  const ownerServiceCount = filterSalonCatalogServices(salon.services).length;

  return (
    <div
      className={cn(
        isMobile ? "pb-1" : "border-b border-border pb-6 pt-8",
      )}
    >
      <div className={cn("flex flex-wrap items-start justify-between", isMobile ? "gap-3" : "gap-4")}>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-semibold uppercase text-muted-foreground",
              isMobile ? "text-[10px] tracking-[0.14em]" : "text-xs tracking-[0.16em]",
            )}
          >
            {salon.category}
          </p>
          <h1
            className={cn(
              "mt-0.5 font-semibold tracking-tight text-foreground",
              isMobile ? "text-xl" : "text-[32px] leading-tight",
            )}
          >
            {salon.name}
          </h1>
          <div className={cn("mt-2 flex flex-wrap items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "fill-foreground")} />
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
          <p
            className={cn(
              "mt-1.5 flex items-start gap-1.5 text-muted-foreground",
              isMobile ? "text-xs" : "text-sm",
            )}
          >
            <MapPin className={cn("mt-0.5 shrink-0", isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
            <span>{salon.address}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void onShare?.()}
            className={cn(
              "grid place-items-center rounded-full border border-border transition-colors hover:bg-muted",
              isMobile ? "h-9 w-9" : "h-10 w-10",
            )}
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
              "grid place-items-center rounded-full border border-border transition-colors hover:bg-muted",
              isMobile ? "h-9 w-9" : "h-10 w-10",
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
          {ownerServiceCount > 0 ? (
            <button
              type="button"
              onClick={() => scrollToSalonSection("services")}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {ownerServiceCount} {t("salon.tabs.services").toLowerCase()}
            </button>
          ) : null}
          {salon.staff.length > 0 ? (
            <button
              type="button"
              onClick={() => scrollToSalonSection("staff")}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {salon.staff.length} {t("salon.tabs.staff").toLowerCase()}
            </button>
          ) : null}
          {salon.amenities.length > 0 ? (
            <button
              type="button"
              onClick={() => scrollToSalonSection("amenities")}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {salon.amenities.length}{" "}
              {t("salon.nav.amenities", { defaultValue: "Mijozlar uchun" })}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
