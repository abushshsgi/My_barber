import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { pexelsCoverUrl } from "@/lib/cover-images";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 4500;

const BANNER_SLIDES = [
  {
    photoId: 3992860,
    to: "/today" as const,
    badgeKey: "todayPage.heroBadge",
    titleKey: "todayPage.heroTitle",
    ctaKey: "todayPage.bookSelected",
    promo: "−30%",
  },
  {
    photoId: 3993448,
    to: "/wallet" as const,
    search: { section: "subscriptions" as const, plan: "starter" as const, returnTo: "/ai-style" as const },
    badgeKey: "homePage.subscriptionPromo.eyebrow",
    titleKey: "homePage.subscriptionPromo.bannerTitle",
    ctaKey: "homePage.subscriptionPromo.cta",
    promo: "AI",
  },
  {
    photoId: 3288365,
    to: "/offers" as const,
    badgeKey: "nav.offers",
    titleKey: "home.heroCarousel.offersTitle",
    ctaKey: "common.viewAll",
    promo: "−20%",
  },
  {
    photoId: 3785147,
    to: "/ai-style" as const,
    badgeKey: "homePage.aiPromoTitle",
    titleKey: "home.heroCarousel.aiTitle",
    ctaKey: "home.heroCarousel.aiCta",
  },
  {
    photoId: 1319460,
    to: "/explore" as const,
    badgeKey: "nav.explore",
    titleKey: "home.heroCarousel.trendsTitle",
    ctaKey: "homePage.quick.trends",
  },
] as const;

/** Mobil home — header ostidagi promo banner. */
export function HomeMobileBanner() {
  const { t } = useTranslation();
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

  useEffect(() => {
    if (!api) return;
    const id = window.setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [api]);

  return (
    <div className="px-4">
      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full overflow-hidden rounded-2xl">
        <CarouselContent className="-ml-0">
          {BANNER_SLIDES.map((slide) => (
            <CarouselItem key={`${slide.to}-${slide.titleKey}`} className="pl-0">
              <Link
                to={slide.to}
                search={"search" in slide ? slide.search : undefined}
                className="group relative block aspect-[2.15/1] w-full overflow-hidden bg-muted"
              >
                <img
                  src={pexelsCoverUrl(slide.photoId, 900)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 size-full object-cover transition duration-500 group-active:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/15" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                {"promo" in slide && slide.promo ? (
                  <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold tracking-tight text-black shadow-sm">
                    {slide.promo}
                  </span>
                ) : null}

                <div className="absolute inset-0 z-10 flex flex-col justify-between p-3.5">
                  <span className="w-fit rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground shadow-sm">
                    {t(slide.badgeKey)}
                  </span>
                  <div>
                    <h2 className="max-w-[85%] text-[15px] font-bold leading-snug tracking-tight text-white drop-shadow-sm">
                      {t(slide.titleKey)}
                    </h2>
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
                      {t(slide.ctaKey)}
                      <ArrowUpRight className="size-3.5" strokeWidth={2.4} />
                    </span>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex justify-center gap-1">
          {BANNER_SLIDES.map((slide, index) => (
            <button
              key={`${slide.to}-${slide.titleKey}`}
              type="button"
              aria-label={`${index + 1} / ${BANNER_SLIDES.length}`}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "pointer-events-auto h-1 rounded-full transition-all duration-300",
                index === selected ? "w-4 bg-white" : "w-1 bg-white/45",
              )}
            />
          ))}
        </div>
      </Carousel>
    </div>
  );
}
