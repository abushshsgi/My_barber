import { useEffect } from "react";
import {
  GenderPosterCarousel,
  type GenderPoster,
} from "@/components/first-visit/GenderPosterCarousel";
import { TRY_ON_COPY } from "@/components/first-visit/first-visit-copy";
import type { OnboardingGender } from "@/lib/first-visit-onboarding";

const POSTERS: Record<OnboardingGender, GenderPoster> = {
  women: {
    src: "/images/onboarding/slide2-women.webp",
    title: TRY_ON_COPY.women.title,
    description: TRY_ON_COPY.women.description,
  },
  men: {
    src: "/images/onboarding/slide2-men.webp",
    title: TRY_ON_COPY.men.title,
    description: TRY_ON_COPY.men.description,
  },
};

/** Inclusive bounds of the empty purple control on both 576×1024 try-on posters. */
const CONTINUE_BOUNDS = { x: 37, y: 923, width: 502, height: 62 } as const;
const NEXT_SLIDE = [
  "/images/onboarding/slide3-women.webp",
  "/images/onboarding/slide3-men.webp",
] as const;

type Props = {
  onContinue: () => void;
};

export function TryOnSlide({ onContinue }: Props) {
  useEffect(() => {
    for (const src of NEXT_SLIDE) {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    }
  }, []);

  return (
    <GenderPosterCarousel
      posters={POSTERS}
      cta="Davom etish →"
      onCta={onContinue}
      bounds={CONTINUE_BOUNDS}
      testId="try-on-poster"
      preload={NEXT_SLIDE}
    />
  );
}
