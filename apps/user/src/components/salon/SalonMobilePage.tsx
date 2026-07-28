import { Link, useRouter } from "@tanstack/react-router";
import { Heart, MapPin, Share2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { MobileBackButton } from "@/components/mobile/MobileBackButton";
import { MobileStickyActionBar } from "@/components/mobile/MobileStickyActionBar";
import { SalonHeroGallery } from "@/components/salon/SalonHeroGallery";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { SalonSectionNav } from "@/components/salon/SalonSectionNav";
import { MOBILE_STICKY_CONTENT_PADDING_CLASS } from "@/lib/layout-constants";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

const glassChrome =
  "grid size-10 place-items-center rounded-full border border-white/40 bg-white/90 text-foreground shadow-sm backdrop-blur-md transition-transform active:scale-95";

export function SalonMobilePage({
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
  const router = useRouter();

  return (
    <div className={cn("min-w-0 overflow-x-clip bg-white", MOBILE_STICKY_CONTENT_PADDING_CLASS)}>
      <div className="relative">
        <SalonHeroGallery salon={salon} variant="mobile" />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-3"
          style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
        >
          <MobileBackButton
            onClick={() => navigateBack(router, "/")}
            className={cn(glassChrome, "pointer-events-auto border-white/40 bg-white/90 shadow-sm")}
            aria-label={t("common.back", { defaultValue: "Orqaga" })}
          />
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onShare?.()}
              className={glassChrome}
              aria-label={t("salon.share", { defaultValue: "Ulashish" })}
            >
              <Share2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={onToggleFav}
              disabled={favPending}
              aria-pressed={fav}
              className={cn(glassChrome, favPending && "opacity-60")}
              aria-label={t("favorites.title", { defaultValue: "Sevimli salonlar" })}
            >
              <Heart className={cn("size-4", fav && "fill-foreground")} />
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black/35 to-transparent" />
      </div>

      <div className="relative z-10 -mt-10 min-w-0 rounded-t-[1.75rem] bg-white px-4 pb-2 pt-3 shadow-[0_-18px_48px_-28px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden />

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {salon.category}
          </p>
          <h1 className="mt-1 text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
            {salon.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background">
              <Star className="size-3.5 fill-background" />
              {salon.rating.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              {salon.reviewCount} {t("home.reviews", { defaultValue: "sharh" })}
            </span>
            {salon.distanceKm > 0 ? (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{salon.distanceKm} km</span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex min-w-0 items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{salon.address}</p>
          </div>
        </div>

        <div className="mt-4">
          <SalonSectionNav salon={salon} variant="mobile" infoOnly />
        </div>

        <div className="mt-1 min-w-0">
          <SalonPageSections
            salon={salon}
            showCalendar={false}
            reviewsAreMock={reviewsAreMock}
            compact
            variant="mobile"
            infoOnly
          />
        </div>
      </div>

      <MobileStickyActionBar>
        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center rounded-xl bg-primary px-5 py-3.5",
            "text-sm font-bold text-primary-foreground transition-opacity active:opacity-90",
          )}
        >
          {t("salon.startBooking", { defaultValue: "Boshlash" })}
        </Link>
      </MobileStickyActionBar>
    </div>
  );
}
