import { motion, useReducedMotion } from "framer-motion";
import { UNIVERSAL_COPY } from "@/components/first-visit/first-visit-copy";

const HERO_BASE = "/images/onboarding/universal";
const HERO_SRC = `${HERO_BASE}.webp`;
const HERO_SRCSET = [
  `${HERO_BASE}-384.webp 384w`,
  `${HERO_BASE}-576.webp 576w`,
  `${HERO_BASE}-768.webp 768w`,
  `${HERO_BASE}.webp 576w`,
]
  .filter(Boolean)
  .join(", ");
const ART_WIDTH = 576;
const ART_HEIGHT = 1024;

/** Inclusive bounds of the empty purple control on universal.webp (576×1024). */
const CONTINUE_BOUNDS = { x: 41, y: 927, width: 494, height: 58 } as const;

const continueBox = {
  left: `${(CONTINUE_BOUNDS.x / ART_WIDTH) * 100}%`,
  top: `${(CONTINUE_BOUNDS.y / ART_HEIGHT) * 100}%`,
  width: `${(CONTINUE_BOUNDS.width / ART_WIDTH) * 100}%`,
  height: `${(CONTINUE_BOUNDS.height / ART_HEIGHT) * 100}%`,
} as const;

type Props = {
  onContinue: () => void;
  onSkip: () => void;
};

export function UniversalSlide({ onContinue, onSkip }: Props) {
  const reduced = useReducedMotion();

  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#f6edfd]"
      style={{ containerType: "size" }}
    >
      <div
        className="@container relative max-h-full min-h-0 w-auto max-w-full shrink-0"
        style={{
          aspectRatio: "9 / 16",
          height: "min(100cqh, calc(100cqw * 16 / 9))",
        }}
      >
        <img
          src={HERO_SRC}
          srcSet={HERO_SRCSET}
          sizes="(max-width: 480px) 100vw, 576px"
          alt=""
          width={ART_WIDTH}
          height={ART_HEIGHT}
          draggable={false}
          decoding="async"
          loading="lazy"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
        />
        <div className="sr-only">
          <p>{UNIVERSAL_COPY.title}</p>
          <p>{UNIVERSAL_COPY.description}</p>
          <ul>
            {UNIVERSAL_COPY.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p>3 tadan 1-qadam</p>
        </div>
        <div className="absolute z-10 flex items-center justify-center" style={continueBox}>
          <motion.button
            type="button"
            onClick={onContinue}
            data-testid="first-visit-next"
            whileTap={reduced ? undefined : { scale: 0.98 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            aria-label="Davom etish"
            style={{ height: "max(100%, 44px)" }}
            className="flex w-full shrink-0 cursor-pointer touch-manipulation appearance-none items-center justify-center rounded-full border-0 bg-transparent px-3 text-center text-[clamp(16px,4.8cqi,20px)] leading-none font-bold whitespace-nowrap text-white select-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset focus-visible:outline-none"
          >
            {UNIVERSAL_COPY.cta}
          </motion.button>
        </div>
        <button type="button" onClick={onSkip} data-testid="first-visit-skip" className="sr-only">
          {UNIVERSAL_COPY.skip}
        </button>
      </div>
    </div>
  );
}
