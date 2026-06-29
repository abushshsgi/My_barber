import { SalonBookingAside } from "@/components/salon/SalonBookingAside";
import { SalonHeroGallery } from "@/components/salon/SalonHeroGallery";
import { SalonPageHeader } from "@/components/salon/SalonPageHeader";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { SalonSectionNav } from "@/components/salon/SalonSectionNav";
import type { SalonDesktopPageProps } from "./types";

/** Layout 5: ixcham hero, keng kontent — minimal va tez skroll. */
export function SalonDesktopLayout5Compact(props: SalonDesktopPageProps) {
  const { salon, fav, onToggleFav, onShare, favPending, reviewsAreMock } = props;

  return (
    <div className="mx-auto max-w-5xl rounded-3xl border-2 border-dashed border-border bg-muted/10 p-4 pb-14 sm:p-6">
      <SalonHeroGallery salon={salon} variant="desktop" size="compact" />
      <div className="mt-6">
        <SalonPageHeader
          salon={salon}
          fav={fav}
          onToggleFav={onToggleFav}
          onShare={onShare}
          favPending={favPending}
          variant="desktop"
        />
      </div>
      <SalonSectionNav salon={salon} />
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_300px] items-start gap-8">
        <SalonPageSections salon={salon} showCalendar={false} reviewsAreMock={reviewsAreMock} />
        <SalonBookingAside salon={salon} className="sticky top-36" compact />
      </div>
    </div>
  );
}
