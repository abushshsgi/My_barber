import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { OnboardingGender } from "@/lib/first-visit-onboarding";

const ART_WIDTH = 576;
const ART_HEIGHT = 1024;
const SWIPE_THRESHOLD = 48;
const SLIDE_EASE = [0.22, 1, 0.36, 1] as const;
const SLIDE_SECONDS = 0.72;

/** Same fitted 9:16 frame as the first onboarding poster. */
const POSTER_FRAME = {
  aspectRatio: "9 / 16",
  height: "min(100cqh, calc(100cqw * 16 / 9))",
} as const;

export type PosterBounds = { x: number; y: number; width: number; height: number };

export type GenderPoster = {
  src: string;
  title: string;
  description: string;
};

type Props = {
  posters: Record<OnboardingGender, GenderPoster>;
  cta: string;
  onCta: () => void;
  bounds: PosterBounds;
  testId: string;
  /** Images for the following main slide. Loaded while this carousel is open. */
  preload?: readonly string[];
};

const EMPTY_PRELOAD: readonly string[] = [];
const ORDER = ["women", "men"] as const;

function boxStyle(bounds: PosterBounds) {
  const top = (bounds.y / ART_HEIGHT) * 100;
  const height = (bounds.height / ART_HEIGHT) * 100;
  return {
    left: `${(bounds.x / ART_WIDTH) * 100}%`,
    width: `${(bounds.width / ART_WIDTH) * 100}%`,
    top: `calc(${top}% - max(0px, (44px - ${height}%) / 2))`,
    height: `max(${height}%, 44px)`,
  } as const;
}

export function GenderPosterCarousel({
  posters,
  cta,
  onCta,
  bounds,
  testId,
  preload = EMPTY_PRELOAD,
}: Props) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const skipFocus = useRef(true);
  const gender = ORDER[index];
  const poster = posters[gender];
  const continueBox = boxStyle(bounds);
  const last = index === ORDER.length - 1;

  useEffect(() => {
    const srcs = [posters.women.src, posters.men.src, ...preload];
    for (const src of srcs) {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    }
  }, [posters, preload]);

  useEffect(() => {
    if (skipFocus.current) {
      skipFocus.current = false;
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-testid="${testId}"] [data-testid="first-visit-next"]`)
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [index, testId]);

  const goTo = (next: number) => {
    if (next === index || next < 0 || next >= ORDER.length) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const onPosterCta = () => {
    if (!last) {
      goTo(index + 1);
      return;
    }
    onCta();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    swiped.current = false;
    origin.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = origin.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = origin.current;
    origin.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const horizontal = Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy);
    if (!horizontal) return;
    swiped.current = true;
    event.preventDefault();
    event.stopPropagation();
    goTo(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f6edfd]">
      <div
        data-testid={testId}
        data-gender={gender}
        role="region"
        aria-roledescription="carousel"
        aria-label={poster.title}
        className="relative h-full w-full touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={() => {
          origin.current = null;
        }}
        onClickCapture={(event) => {
          if (!swiped.current) return;
          swiped.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          goTo(index + (event.key === "ArrowRight" ? 1 : -1));
        }}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={gender}
            data-testid={`${testId}-${gender}`}
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ containerType: "size" }}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                x: reduced ? 0 : dir > 0 ? "100%" : "-100%",
                opacity: reduced ? 1 : 0,
                scale: reduced ? 1 : 0.96,
              }),
              center: { x: 0, opacity: 1, scale: 1, pointerEvents: "auto" },
              exit: (dir: number) => ({
                x: reduced ? 0 : dir > 0 ? "-28%" : "28%",
                opacity: reduced ? 1 : 0,
                scale: reduced ? 1 : 0.98,
                pointerEvents: "none",
              }),
            }}
            initial={reduced ? false : "enter"}
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0 : SLIDE_SECONDS, ease: SLIDE_EASE }}
          >
            <div
              className="@container relative max-h-full min-h-0 w-auto max-w-full shrink-0"
              style={POSTER_FRAME}
            >
              <img
                src={poster.src}
                alt=""
                width={ART_WIDTH}
                height={ART_HEIGHT}
                draggable={false}
                decoding="async"
                fetchPriority="high"
                className="pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <div className="absolute z-10" style={continueBox}>
                <motion.button
                  type="button"
                  onClick={onPosterCta}
                  data-testid="first-visit-next"
                  whileTap={reduced ? undefined : { scale: 0.98 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  aria-label={cta}
                  className="flex h-full min-h-[44px] w-full cursor-pointer touch-manipulation appearance-none items-center justify-center rounded-full border-0 bg-transparent px-3 text-center text-[clamp(16px,4.8cqi,20px)] leading-none font-bold whitespace-nowrap text-white select-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset focus-visible:outline-none"
                >
                  {cta}
                </motion.button>
              </div>
              <div className="sr-only">
                <p>{poster.title}</p>
                <p>{poster.description}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <p className="sr-only" aria-live="polite">
          {poster.title}
        </p>
      </div>
    </div>
  );
}
