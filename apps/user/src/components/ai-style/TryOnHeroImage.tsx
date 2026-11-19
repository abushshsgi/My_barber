import { useEffect } from "react";
import { removeMorphLcpStatic } from "@/lib/morph-lcp-static";
import {
  TRY_ON_HERO_DEFAULT_SRC,
  TRY_ON_HERO_SRCSET,
  TRY_ON_HERO_WIDTHS,
} from "@/lib/try-on-hero-assets";

/** LCP image on /ai-style mobile — responsive WebP, PNG fallback only when needed. */

type Props = {
  className?: string;
};

export function TryOnHeroImage({ className }: Props) {
  useEffect(() => {
    removeMorphLcpStatic();
  }, []);

  return (
    <picture>
      <source type="image/webp" srcSet={TRY_ON_HERO_SRCSET} sizes="100vw" />
      <img
        src={TRY_ON_HERO_DEFAULT_SRC}
        srcSet={TRY_ON_HERO_SRCSET}
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
