import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
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
    <div className="min-w-0 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]">
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

      <div className="mt-6 min-w-0 px-4">
        <SalonPageSections salon={salon} calendarMonths={1} showCalendar reviewsAreMock={reviewsAreMock} />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-3 backdrop-blur-md"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-end">
          <Link
            to="/booking/$salonId"
            params={{ salonId: salon.id }}
            className={cn(
              "neo-cta flex w-full items-center justify-center bg-primary px-6 py-3.5",
              "text-sm font-bold text-primary-foreground",
            )}
          >
            {t("salon.bookNow")}
          </Link>
        </div>
      </div>
    </div>
  );
}
