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
        isMobile ? "h-[280px]" : "h-full min-h-[min(420px,42vh)] rounded-2xl",
      )}
    >
      <SalonImageCarousel
        coverUrl={salon.coverUrl}
        portfolio={salon.portfolio}
        alt={salon.name}
        autoPlay
        showDots
        className="h-full w-full"
      />
    </div>
  );
}

/** @deprecated use SalonImageCarousel / salonCarouselImages */
export { salonCarouselImages as salonHeroImages } from "@/lib/salon-images";
