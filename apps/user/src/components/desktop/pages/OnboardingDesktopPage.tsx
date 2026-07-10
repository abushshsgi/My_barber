import { Stepper } from "@/components/Stepper";
import { OnboardingSteps } from "@/components/onboarding/OnboardingSteps";
import {
  ONBOARDING_STEPS,
  type OnboardingFlowState,
} from "@/components/onboarding/useOnboardingFlow";
import { cn } from "@/lib/utils";

type Props = {
  state: OnboardingFlowState;
};

export function OnboardingDesktopPage({ state }: Props) {
  const { step, setStep, canNext, onPrimary, busy } = state;

  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,oklch(0.94_0.02_85)_0%,transparent_55%),radial-gradient(ellipse_at_90%_30%,oklch(0.95_0.015_70)_0%,transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-[560px] flex-col px-8 py-14 xl:max-w-[600px] xl:px-10 xl:py-16">
        <header className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Yangi profil
          </p>
          <h1 className="mt-3 text-[2.35rem] font-extrabold leading-[1.1] tracking-tight text-foreground xl:text-[2.6rem]">
            Sizni tanishib olaylik
          </h1>
          <p className="mt-3 max-w-[34rem] text-[15px] leading-relaxed text-muted-foreground">
            Bir necha qadam — keyin sizga yaqin salon va ustalarni tavsiya qilamiz.
          </p>
        </header>

        <div className="mt-10 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both [animation-delay:80ms]">
          <Stepper steps={[...ONBOARDING_STEPS]} current={step} />
        </div>

        <div
          key={step}
          className="flex flex-1 flex-col justify-center py-12 animate-in fade-in slide-in-from-bottom-2 duration-400"
        >
          <OnboardingSteps state={state} variant="desktop" />
        </div>

        <div className="flex gap-3 animate-in fade-in duration-500 fill-mode-both [animation-delay:120ms]">
          {step > 1 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-[1.35rem] border border-border bg-background py-4 text-sm font-bold text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              Orqaga
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canNext || busy}
            onClick={onPrimary}
            className={cn(
              "rounded-[1.35rem] bg-foreground py-4 text-sm font-bold tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-40",
              step > 1 ? "flex-[2]" : "w-full",
            )}
          >
            {busy ? "Kutilmoqda…" : step === 3 ? "Boshlash" : "Keyingi"}
          </button>
        </div>
      </div>
    </div>
  );
}
