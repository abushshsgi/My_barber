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
  description?: string;
  /** Mobile explore detail */
  variant?: "default" | "mobileHero" | "gridCard";
};

export function ExploreStyleGallery({
  items,
  title,
  badge,
  className,
  autoPlay = true,
  showThumbs = true,
  description,
  variant = "default",
}: Props) {
  const isMobileHero = variant === "mobileHero";
  const isGridCard = variant === "gridCard";
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

  const thumbRow =
    showThumbs && slides.length > 1 ? (
      <div
        className={cn(
          "grid gap-2",
          isMobileHero
            ? "mt-4 grid-cols-4"
            : slides.length > 1
              ? "grid-cols-4"
              : "hidden",
        )}
      >
        {slides.map((item, index) => (
          <button
            key={`${item.view}-${item.url}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              "min-w-0 text-left transition",
              index === activeIndex ? "opacity-100" : "opacity-70 active:opacity-100",
            )}
          >
            <div
              className={cn(
                "relative aspect-[3/4] overflow-hidden bg-[#E8E8E8]",
                isMobileHero ? "rounded-xl" : "rounded-xl",
                index === activeIndex
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "ring-1 ring-border/60",
              )}
            >
              <img
                src={item.url}
                alt={`${title} ${item.label}`}
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
            <p
              className={cn(
                "truncate text-center font-bold uppercase tracking-wide text-muted-foreground",
                isMobileHero ? "mt-1.5 text-[9px]" : "py-1 text-[10px]",
              )}
            >
              {item.label}
            </p>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className={cn(isMobileHero ? "space-y-0" : "space-y-3", className)}>
      <div
        className={cn(
          "overflow-hidden bg-[#E8E8E8]",
          isGridCard && "rounded-2xl",
          isMobileHero && "rounded-[20px]",
          !isMobileHero && !isGridCard && "rounded-3xl border border-border",
        )}
      >
        <div
          className={cn(
            isMobileHero
              ? "relative aspect-[3/4] w-full max-h-[min(52dvh,460px)]"
              : "relative aspect-[3/4]",
          )}
        >
          <img
            key={active?.url}
            src={active?.url}
            alt={`${title} — ${active?.label ?? ""}`}
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500",
              fade ? "opacity-100" : "opacity-0",
            )}
          />
          {!isMobileHero && !isGridCard && badge ? <div className="absolute left-3 top-3">{badge}</div> : null}
          {!isMobileHero && !isGridCard && active?.label ? (
            <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {active.label}
            </span>
          ) : null}
          {!isMobileHero && slides.length > 1 ? (
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

      {isMobileHero && description ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}

      {thumbRow}
    </div>
  );
}
