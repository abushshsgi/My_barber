import { useCallback, useEffect, useState } from "react";
import type { Salon } from "@/lib/mock-data";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { PLACEHOLDER_SALON } from "@/lib/cover-images";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

function isStockOrPlaceholder(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("placeholder-salon") ||
    u.includes("/covers/pexels/") ||
    u.includes("images.pexels.com") ||
    u.includes("picsum.photos")
  );
}

/** Faqat haqiqiy yuklangan rasmlar — 1 ramka = 1 rasm. */
export function salonHeroImages(salon: Salon): string[] {
  const raw = [salon.coverUrl, ...salon.portfolio]
    .map((u) => {
      const trimmed = u?.trim();
      if (!trimmed) return null;
      return resolveMediaUrl(trimmed) ?? trimmed;
    })
    .filter((u): u is string => Boolean(u) && !isStockOrPlaceholder(u));

  const unique = raw.filter((url, i, arr) => arr.indexOf(url) === i);
  return unique.length > 0 ? unique : [PLACEHOLDER_SALON];
}

export function SalonHeroGallery({
  salon,
  variant = "desktop",
}: {
  salon: Salon;
  variant?: "desktop" | "mobile";
}) {
  const images = salonHeroImages(salon);
  const isMobile = variant === "mobile";
  const multi = images.length > 1;
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback((carouselApi: CarouselApi | undefined) => {
    if (!carouselApi) return;
    setSelected(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        isMobile ? "h-[260px]" : "h-full min-h-[min(420px,42vh)] rounded-2xl",
      )}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop: multi, watchDrag: multi }}
        className="h-full w-full [&>div]:h-full"
      >
        <CarouselContent className="-ml-0 h-full">
          {images.map((src, i) => (
            <CarouselItem key={`${src}-${i}`} className="h-full basis-full pl-0">
              <div className="relative h-full w-full">
                <img
                  src={src}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.endsWith(PLACEHOLDER_SALON)) {
                      img.src = PLACEHOLDER_SALON;
                    }
                  }}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {multi ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === selected ? "w-4 bg-white" : "w-1.5 bg-white/45",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
