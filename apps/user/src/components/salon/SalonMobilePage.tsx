import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { formatPrice } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { SalonHeroGallery } from "@/components/salon/SalonHeroGallery";
import { SalonPageHeader } from "@/components/salon/SalonPageHeader";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { cn } from "@/lib/utils";

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

  return (
    <div className="pb-28">
      <div className="relative">
        <SalonHeroGallery salon={salon} variant="mobile" />
        <div className="absolute inset-x-0 top-0">
          <PageHeader showBack transparent />
        </div>
      </div>

      <div className="relative z-10 -mt-6 px-4">
        <SalonPageHeader
          salon={salon}
          fav={fav}
          onToggleFav={onToggleFav}
          onShare={onShare}
          favPending={favPending}
          variant="mobile"
        />
      </div>

      <div className="mt-6 px-4">
        <SalonPageSections salon={salon} calendarMonths={1} showCalendar reviewsAreMock={reviewsAreMock} />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur-md"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        <div className="mx-auto flex max-w-[480px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("salon.bookNow")}
            </p>
            <p className="truncate text-base font-bold tabular-nums">{formatPrice(salon.priceFrom)}+</p>
          </div>
          <Link
            to="/booking/$salonId"
            params={{ salonId: salon.id }}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-foreground px-6 py-3.5",
              "text-sm font-bold text-background",
            )}
          >
            {t("salon.bookNow")}
          </Link>
        </div>
      </div>
    </div>
  );
}
