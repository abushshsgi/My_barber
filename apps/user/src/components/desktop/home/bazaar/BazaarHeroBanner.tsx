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
    to: "/today",
    badgeKey: "todayPage.heroBadge",
    titleKey: "todayPage.heroTitle",
    descKey: "todayPage.heroDesc",
    ctaKey: "todayPage.bookSelected",
    promo: "−30%",
  },
  {
    photoId: 3992859,
    to: "/map",
    badgeKey: "nav.map",
    titleKey: "home.mapPreview.explore",
    descKey: "home.mapPreview.hint",
    ctaKey: "home.mapPreview.openMap",
  },
  {
    photoId: 3288365,
    to: "/offers",
    badgeKey: "nav.offers",
    titleKey: "home.heroCarousel.offersTitle",
    descKey: "home.heroCarousel.offersDesc",
    ctaKey: "common.viewAll",
    promo: "−20%",
  },
  {
    photoId: 3785147,
    to: "/ai-style",
    badgeKey: "homePage.aiPromoTitle",
    titleKey: "home.heroCarousel.aiTitle",
    descKey: "homePage.aiPromoHint",
    ctaKey: "home.heroCarousel.aiCta",
  },
  {
    photoId: 1319460,
    to: "/explore",
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
        className="h-[clamp(280px,34vw,420px)] w-full overflow-hidden rounded-2xl border border-border shadow-[0_10px_36px_rgba(15,15,15,0.08)] [&>div]:h-full"
      >
        <CarouselContent className="-ml-0 h-full">
          {HERO_SLIDES.map((slide) => (
            <CarouselItem key={slide.to} className="h-full pl-0">
              <Link
                to={slide.to}
                className="group relative block h-full min-h-[280px] w-full overflow-hidden"
              >
                <img
                  src={pexelsCoverUrl(slide.photoId, 1200)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                {"promo" in slide && slide.promo ? (
                  <span className="absolute right-5 top-5 z-10 rounded-full bg-amber-400 px-3.5 py-1.5 text-sm font-bold tracking-tight text-black shadow-md">
                    {slide.promo}
                  </span>
                ) : null}

                <div className="absolute inset-0 z-10 flex flex-col justify-between p-5 xl:p-7">
                  <span className="w-fit rounded-full bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-foreground shadow-md">
                    {t(slide.badgeKey)}
                  </span>

                  <div className="max-w-xl">
                    <h2 className="text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-sm xl:text-3xl 2xl:text-4xl">
                      {t(slide.titleKey)}
                    </h2>
                    <p className="mt-2 line-clamp-2 max-w-lg text-sm font-medium leading-relaxed text-white/90 xl:text-base">
                      {t(slide.descKey)}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-foreground shadow-md transition group-hover:bg-white/95 xl:mt-5 xl:px-5 xl:py-3">
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
              key={slide.to}
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
