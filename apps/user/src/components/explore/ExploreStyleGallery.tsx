import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { HairstyleGalleryItem } from "@/lib/hairstyles/catalog";
import { useGalleryCarousel } from "@/components/explore/useGalleryCarousel";

type Props = {
  items: HairstyleGalleryItem[];
  title: string;
  badge?: React.ReactNode;
  className?: string;
  autoPlay?: boolean;
  showThumbs?: boolean;
  /** Mobile explore detail — keng, chegarasiz rasm */
  variant?: "default" | "mobileHero";
};

export function ExploreStyleGallery({
  items,
  title,
  badge,
  className,
  autoPlay = true,
  showThumbs = true,
  variant = "default",
}: Props) {
  const isMobileHero = variant === "mobileHero";
  const slides = useMemo(() => items.filter((item) => item.url), [items]);
  const { activeIndex, setActiveIndex } = useGalleryCarousel(autoPlay ? slides.length : 1);
  const active = slides[activeIndex] ?? slides[0];
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setFade(false);
    const timer = window.setTimeout(() => setFade(true), 40);
    return () => window.clearTimeout(timer);
  }, [active?.url]);

  if (!slides.length) return null;

  return (
    <div className={cn(isMobileHero ? "space-y-0" : "space-y-3", className)}>
      <div
        className={cn(
          "overflow-hidden bg-[#E8E8E8]",
          isMobileHero ? "rounded-none" : "rounded-3xl border border-border",
        )}
      >
        <div className={cn(isMobileHero ? "relative min-h-[min(62dvh,560px)]" : "relative aspect-[3/4]")}>
          <img
            key={active?.url}
            src={active?.url}
            alt={`${title} — ${active?.label ?? ""}`}
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500",
              fade ? "opacity-100" : "opacity-0",
            )}
          />
          {!isMobileHero && badge ? <div className="absolute left-3 top-3">{badge}</div> : null}
          {!isMobileHero && active?.label ? (
            <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {active.label}
            </span>
          ) : null}
          {slides.length > 1 ? (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((item, index) => (
                <span
                  key={item.view}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {showThumbs && slides.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {slides.map((item, index) => (
            <button
              key={`${item.view}-${item.url}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "overflow-hidden rounded-xl border-2 transition",
                index === activeIndex ? "border-foreground" : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              <div className="relative aspect-[3/4] bg-[#E8E8E8]">
                <img
                  src={item.url}
                  alt={`${title} ${item.label}`}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
              <p className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
