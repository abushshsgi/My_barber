import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
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

const AUTOPLAY_MS = 5000;

const HERO_SLIDES = [
  {
    photoId: 3992860,
    to: "/today" as const,
    badgeKey: "todayPage.heroBadge",
    titleKey: "todayPage.heroTitle",
    descKey: "todayPage.heroDesc",
    ctaKey: "todayPage.bookSelected",
    promo: "−30%",
  },
  {
    photoId: 3993448,
    to: "/wallet" as const,
    search: { section: "subscriptions" as const },
    badgeKey: "homePage.subscriptionPromo.eyebrow",
    titleKey: "homePage.subscriptionPromo.bannerTitle",
    descKey: "homePage.subscriptionPromo.hint",
    ctaKey: "homePage.subscriptionPromo.cta",
    promo: "AI",
  },
  {
    photoId: 3992859,
    to: "/map" as const,
    badgeKey: "nav.map",
    titleKey: "home.mapPreview.explore",
    descKey: "home.mapPreview.hint",
    ctaKey: "home.mapPreview.openMap",
  },
  {
    photoId: 3288365,
    to: "/offers" as const,
    badgeKey: "nav.offers",
    titleKey: "home.heroCarousel.offersTitle",
    descKey: "home.heroCarousel.offersDesc",
    ctaKey: "common.viewAll",
    promo: "−20%",
  },
  {
    photoId: 3785147,
    to: "/ai-style" as const,
    badgeKey: "homePage.aiPromoTitle",
    titleKey: "home.heroCarousel.aiTitle",
    descKey: "homePage.aiPromoHint",
    ctaKey: "home.heroCarousel.aiCta",
  },
  {
    photoId: 1319460,
    to: "/explore" as const,
    badgeKey: "nav.explore",
    titleKey: "home.heroCarousel.trendsTitle",
    descKey: "home.heroCarousel.trendsDesc",
    ctaKey: "homePage.quick.trends",
  },
] as const;

type Props = {
  className?: string;
};

export function BazaarHeroBanner({ className }: Props) {
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

    const id = window.setInterval(() => {
      api.scrollNext();
    }, AUTOPLAY_MS);

    return () => window.clearInterval(id);
  }, [api]);

  return (
    <div className={cn("relative w-full", className)}>
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        className="h-[clamp(180px,22vw,280px)] w-full overflow-hidden rounded-2xl border border-border shadow-[0_10px_36px_rgba(15,15,15,0.08)] [&>div]:h-full"
      >
        <CarouselContent className="-ml-0 h-full">
          {HERO_SLIDES.map((slide) => (
            <CarouselItem key={`${slide.to}-${slide.titleKey}`} className="h-full pl-0">
              <Link
                to={slide.to}
                search={"search" in slide ? slide.search : undefined}
                className="group relative block h-full min-h-[180px] w-full overflow-hidden"
              >
                <img
                  src={pexelsCoverUrl(slide.photoId, 1200)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                {"promo" in slide && slide.promo ? (
                  <span className="absolute right-5 top-5 z-10 rounded-full bg-amber-400 px-3.5 py-1.5 text-sm font-bold tracking-tight text-black shadow-md">
                    {slide.promo}
                  </span>
                ) : null}

                <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 xl:p-5">
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground shadow-md">
                    {t(slide.badgeKey)}
                  </span>

                  <div className="max-w-xl">
                    <h2 className="text-xl font-bold leading-tight tracking-tight text-white drop-shadow-sm xl:text-2xl">
                      {t(slide.titleKey)}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 max-w-lg text-sm font-medium leading-relaxed text-white/90">
                      {t(slide.descKey)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-foreground shadow-md transition group-hover:bg-white/95">
                      {t(slide.ctaKey)}
                      <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>

        <button
          type="button"
          aria-label={t("common.back")}
          onClick={() => api?.scrollPrev()}
          className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/65"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label={t("common.next")}
          onClick={() => api?.scrollNext()}
          className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/65"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center gap-1.5">
          {HERO_SLIDES.map((slide, index) => (
            <button
              key={`${slide.to}-${slide.titleKey}`}
              type="button"
              aria-label={`${index + 1} / ${HERO_SLIDES.length}`}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "pointer-events-auto h-1.5 rounded-full transition-all duration-300",
                index === selected ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </Carousel>
    </div>
  );
}
