import { ShareSlide } from "@/components/first-visit/ShareSlide";
import { TryOnSlide } from "@/components/first-visit/TryOnSlide";
import { UniversalSlide } from "@/components/first-visit/UniversalSlide";

type Props = {
  index: 0 | 1 | 2;
  onContinue: () => void;
  onComplete: () => void;
  onSkip: () => void;
};

export function OnboardingSlide({ index, onContinue, onComplete, onSkip }: Props) {
  if (index === 0) {
    return <UniversalSlide onContinue={onContinue} onSkip={onSkip} />;
  }

  if (index === 1) {
    return <TryOnSlide onContinue={onContinue} />;
  }

  return <ShareSlide onStart={onComplete} />;
}
