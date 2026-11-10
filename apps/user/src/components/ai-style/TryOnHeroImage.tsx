/** LCP image on /ai-style mobile — responsive WebP, PNG fallback only when needed. */

const BASE = "/ai-style/try-on-selfie-hero";
const WIDTHS = [480, 720, 864] as const;

const SRCSET = WIDTHS.map((w) => `${BASE}-${w}.webp ${w}w`).join(", ");

type Props = {
  className?: string;
};

export function TryOnHeroImage({ className }: Props) {
  return (
    <picture>
      <source type="image/webp" srcSet={SRCSET} sizes="100vw" />
      <img
        src={`${BASE}-720.webp`}
        srcSet={SRCSET}
        sizes="100vw"
        alt=""
        width={864}
        height={1152}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className={className}
      />
    </picture>
  );
}

export const TRY_ON_HERO_PRELOAD = `${BASE}-720.webp`;
