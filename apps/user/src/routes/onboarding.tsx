import { createFileRoute } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { OnboardingDesktopPage } from "@/components/desktop/pages/OnboardingDesktopPage";
import { OnboardingSteps } from "@/components/onboarding/OnboardingSteps";
import {
  ONBOARDING_STEPS,
  useOnboardingFlow,
} from "@/components/onboarding/useOnboardingFlow";
import { Stepper } from "@/components/Stepper";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Profil sozlash — mysaloon.uz" }] }),
  component: OnboardingFlow,
});

function OnboardingMobile({ state }: { state: ReturnType<typeof useOnboardingFlow> }) {
  const { step, setStep, canNext, onPrimary, busy } = state;

  return (
    <div className="mobile-neo neo-page flex min-h-[100dvh] flex-col px-6 py-8 pt-safe">
      <p className="label-eyebrow">Yangi profil</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Sizni tanishib olaylik</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bir necha qadam — keyin sizga yaqin salon va ustalarni tavsiya qilamiz.
      </p>

      <div className="mt-6">
        <Stepper steps={[...ONBOARDING_STEPS]} current={step} />
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        <OnboardingSteps state={state} variant="mobile" />
      </div>

      <div className="flex gap-2">
        {step > 1 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStep((s) => s - 1)}
            className="neo-cta flex-1 py-4 text-sm font-bold"
          >
            Orqaga
          </button>
        ) : null}
        <button
          type="button"
          disabled={!canNext || busy}
          onClick={onPrimary}
          className={cn(
            "neo-cta bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-50",
            step > 1 ? "flex-[2]" : "w-full",
          )}
        >
          {busy ? "Kutilmoqda…" : step === 3 ? "Boshlash" : "Keyingi"}
        </button>
      </div>
    </div>
  );
}

function OnboardingFlow() {
  const state = useOnboardingFlow();

  return (
    <DesktopPageSplit
      mobile={<OnboardingMobile state={state} />}
      desktop={<OnboardingDesktopPage state={state} />}
    />
  );
}
