import { useCallback, useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { PLACEHOLDER_SALON } from "@/lib/cover-images";
import { mediaUrlCandidates, salonCarouselImages } from "@/lib/salon-images";
import { cn } from "@/lib/utils";

const AUTO_MS = 3500;

type Props = {
  coverUrl?: string | null;
  portfolio?: string[] | null;
  alt?: string;
  className?: string;
  /** Outer frame height/aspect — parent sets size */
  imgClassName?: string;
  autoPlay?: boolean;
  showDots?: boolean;
  /** pause autoplay while user is interacting */
  pauseOnInteract?: boolean;
};

function SlideImage({
  src,
  alt,
  eager,
  className,
  onDead,
}: {
  src: string;
  alt: string;
  eager?: boolean;
  className?: string;
  onDead: (src: string) => void;
}) {
  const [current, setCurrent] = useState(() => mediaUrlCandidates(src)[0] ?? src);
  const tried = useRef(new Set<string>());

  useEffect(() => {
    const first = mediaUrlCandidates(src)[0] ?? src;
    tried.current = new Set();
    setCurrent(first);
  }, [src]);

  return (
    <img
      src={current}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => {
        tried.current.add(current);
        const next = mediaUrlCandidates(src).find((c) => !tried.current.has(c));
        if (next) {
          setCurrent(next);
          return;
        }
        if (current !== PLACEHOLDER_SALON) {
          onDead(src);
        }
      }}
    />
  );
}

/** Salon cover/gallery — avtomatik aylanadigan karusel. */
export function SalonImageCarousel({
  coverUrl,
  portfolio,
  alt = "",
  className,
  imgClassName,
  autoPlay = true,
  showDots = true,
  pauseOnInteract = true,
}: Props) {
  const portfolioKey = (portfolio ?? []).join("\0");
  const initial = salonCarouselImages({ coverUrl, portfolio });
  const [images, setImages] = useState(initial);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    setImages(salonCarouselImages({ coverUrl, portfolio }));
  }, [coverUrl, portfolioKey]);

  const multi = images.length > 1;

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
    if (!api || !multi || !autoPlay) return;
    const id = window.setInterval(() => {
      if (paused.current) return;
      api.scrollNext();
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [api, multi, autoPlay, images.length]);

  const markDead = (src: string) => {
    setImages((prev) => {
      const next = prev.filter((u) => u !== src);
      return next.length > 0 ? next : [PLACEHOLDER_SALON];
    });
  };

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-muted", className)}
      onPointerDown={() => {
        if (pauseOnInteract) paused.current = true;
      }}
      onPointerUp={() => {
        if (pauseOnInteract) window.setTimeout(() => {
          paused.current = false;
        }, 2500);
      }}
      onPointerLeave={() => {
        paused.current = false;
      }}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop: multi, watchDrag: multi, align: "start" }}
        className="h-full w-full [&>div]:h-full"
      >
        <CarouselContent className="-ml-0 h-full">
          {images.map((src, i) => (
            <CarouselItem key={`${src}-${i}`} className="h-full min-w-0 basis-full pl-0">
              <div className="relative h-full w-full overflow-hidden">
                <SlideImage
                  src={src}
                  alt={alt}
                  eager={i === 0}
                  onDead={markDead}
                  className={cn("absolute inset-0 h-full w-full object-cover", imgClassName)}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {showDots && multi ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1.5">
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
