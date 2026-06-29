import { SalonBookingAside } from "@/components/salon/SalonBookingAside";
import { SalonHeroGallery } from "@/components/salon/SalonHeroGallery";
import { SalonPageHeader } from "@/components/salon/SalonPageHeader";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { SalonSectionNav } from "@/components/salon/SalonSectionNav";
import type { SalonDesktopPageProps } from "./types";

/** Layout 1: klassik — galereya, nav, 2 ustun (kontent + bron). */
export function SalonDesktopLayout1Classic(props: SalonDesktopPageProps) {
  const { salon, fav, onToggleFav, onShare, favPending, reviewsAreMock } = props;

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <SalonHeroGallery salon={salon} variant="desktop" />
      <SalonPageHeader
        salon={salon}
        fav={fav}
        onToggleFav={onToggleFav}
        onShare={onShare}
        favPending={favPending}
        variant="desktop"
      />
      <SalonSectionNav salon={salon} />
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_340px] items-start gap-10 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-14">
        <SalonPageSections salon={salon} showCalendar={false} reviewsAreMock={reviewsAreMock} />
        <SalonBookingAside salon={salon} className="sticky top-36" />
      </div>
    </div>
  );
}
