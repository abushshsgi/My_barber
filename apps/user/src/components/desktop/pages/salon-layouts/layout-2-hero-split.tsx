import { SalonBookingAside } from "@/components/salon/SalonBookingAside";
import { SalonHeroGallery } from "@/components/salon/SalonHeroGallery";
import { SalonPageHeader } from "@/components/salon/SalonPageHeader";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { SalonSectionNav } from "@/components/salon/SalonSectionNav";
import type { SalonDesktopPageProps } from "./types";

/** Layout 2: yuqorida galereya + sarlavha yonma-yon, pastda to‘liq kenglik. */
export function SalonDesktopLayout2HeroSplit(props: SalonDesktopPageProps) {
  const { salon, fav, onToggleFav, onShare, favPending, reviewsAreMock } = props;

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <div className="grid items-start gap-6 rounded-2xl border border-border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8 lg:p-6">
        <SalonHeroGallery salon={salon} variant="desktop" />
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
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8 xl:gap-12">
        <SalonPageSections salon={salon} showCalendar={false} reviewsAreMock={reviewsAreMock} />
        <SalonBookingAside salon={salon} className="sticky top-36" compact />
      </div>
    </div>
  );
}
