import {
  GenderPosterCarousel,
  type GenderPoster,
} from "@/components/first-visit/GenderPosterCarousel";
import { SHARE_COPY } from "@/components/first-visit/first-visit-copy";
import type { OnboardingGender } from "@/lib/first-visit-onboarding";

const POSTERS: Record<OnboardingGender, GenderPoster> = {
  women: {
    src: "/images/onboarding/slide3-women.webp",
    title: SHARE_COPY.women.title,
    description: SHARE_COPY.women.description,
  },
  men: {
    src: "/images/onboarding/slide3-men.webp",
    title: SHARE_COPY.men.title,
    description: SHARE_COPY.men.description,
  },
};

/** Inclusive bounds of the empty purple control on both 576×1024 share posters. */
const START_BOUNDS = { x: 38, y: 922, width: 500, height: 62 } as const;

type Props = {
  onStart: () => void;
};

export function ShareSlide({ onStart }: Props) {
  return (
    <GenderPosterCarousel
      posters={POSTERS}
      cta="Boshlash →"
      onCta={onStart}
      bounds={START_BOUNDS}
      testId="share-poster"
    />
  );
}
