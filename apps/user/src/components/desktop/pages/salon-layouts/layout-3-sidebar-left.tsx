import { SalonBookingAside } from "@/components/salon/SalonBookingAside";
import { SalonHeroGallery } from "@/components/salon/SalonHeroGallery";
import { SalonPageHeader } from "@/components/salon/SalonPageHeader";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { SalonSectionNav } from "@/components/salon/SalonSectionNav";
import type { SalonDesktopPageProps } from "./types";

/** Layout 3: chapda sticky bron paneli, o‘ngda kontent. */
export function SalonDesktopLayout3SidebarLeft(props: SalonDesktopPageProps) {
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
      <div className="mt-8 grid grid-cols-[320px_minmax(0,1fr)] items-start gap-10 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-14">
        <SalonBookingAside salon={salon} className="sticky top-36" />
        <SalonPageSections salon={salon} showCalendar={false} reviewsAreMock={reviewsAreMock} />
      </div>
    </div>
  );
}
