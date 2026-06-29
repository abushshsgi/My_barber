import { SalonBookingAside } from "@/components/salon/SalonBookingAside";
import { SalonHeroGallery } from "@/components/salon/SalonHeroGallery";
import { SalonPageHeader } from "@/components/salon/SalonPageHeader";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { SalonSectionNav } from "@/components/salon/SalonSectionNav";
import { salonSectionUi } from "./section-styles";
import type { SalonDesktopPageProps } from "./types";

/** Layout 5: ixcham hero, keng kontent — minimal va tez skroll. */
export function SalonDesktopLayout5Compact(props: SalonDesktopPageProps) {
  const { salon, fav, onToggleFav, onShare, favPending, reviewsAreMock, layoutId } = props;
  const ui = salonSectionUi(layoutId);

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
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_260px] items-start gap-6">
        <SalonPageSections salon={salon} layoutId={layoutId} showCalendar={false} reviewsAreMock={reviewsAreMock} />
        <SalonBookingAside salon={salon} asideVariant={ui.aside} compact className="sticky top-36" />
      </div>
    </div>
  );
}
