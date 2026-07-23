import type { Salon } from "@/lib/mock-data";
import { SalonImageCarousel } from "@/components/salon/SalonImageCarousel";
import { cn } from "@/lib/utils";

export function SalonHeroGallery({
  salon,
  variant = "desktop",
}: {
  salon: Salon;
  variant?: "desktop" | "mobile";
}) {
  const isMobile = variant === "mobile";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        isMobile
          ? "aspect-[4/3] max-h-[52vh] min-h-[280px] w-full"
          : "h-full min-h-[min(420px,42vh)] rounded-2xl",
      )}
    >
      <SalonImageCarousel
        coverUrl={salon.coverUrl}
        portfolio={salon.portfolio}
        alt={salon.name}
        autoPlay
        showDots
        dotsClassName={isMobile ? "bottom-12" : undefined}
        className={cn("h-full w-full", isMobile && "absolute inset-0")}
      />
    </div>
  );
}

/** @deprecated use SalonImageCarousel / salonCarouselImages */
export { salonCarouselImages as salonHeroImages } from "@/lib/salon-images";
