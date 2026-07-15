import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { SalonHeroGallery } from "@/components/salon/SalonHeroGallery";
import { SalonPageHeader } from "@/components/salon/SalonPageHeader";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { MobileStickyActionBar } from "@/components/mobile/MobileStickyActionBar";
import { MOBILE_STICKY_CONTENT_PADDING_CLASS } from "@/lib/layout-constants";
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
    <div className={cn("min-w-0 overflow-x-clip", MOBILE_STICKY_CONTENT_PADDING_CLASS)}>
      <PageHeader showBack sticky />

      <SalonHeroGallery salon={salon} variant="mobile" />

      <div className="min-w-0 px-4 pt-3">
        <SalonPageHeader
          salon={salon}
          fav={fav}
          onToggleFav={onToggleFav}
          onShare={onShare}
          favPending={favPending}
          variant="mobile"
        />
      </div>

      <div className="mt-4 min-w-0 px-4">
        <SalonPageSections
          salon={salon}
          calendarMonths={1}
          showCalendar
          reviewsAreMock={reviewsAreMock}
          compact
        />
      </div>

      <MobileStickyActionBar>
        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className={cn(
            "flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3",
            "text-sm font-bold text-primary-foreground",
          )}
        >
          {t("salon.bookNow")}
        </Link>
      </MobileStickyActionBar>
    </div>
  );
}
