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
  const isLocationStep = step === 3;

  return (
    <div className="relative bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,oklch(0.94_0.02_85)_0%,transparent_55%),radial-gradient(ellipse_at_90%_30%,oklch(0.95_0.015_70)_0%,transparent_45%)]"
      />

      <div
        className={cn(
          "relative mx-auto flex w-full flex-col px-8 pt-6 pb-4 xl:px-10",
          isLocationStep ? "max-w-[880px]" : "max-w-[520px]",
        )}
      >
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Yangi profil
          </p>
          <h1
            className={cn(
              "mt-2 font-extrabold leading-[1.1] tracking-tight text-foreground",
              isLocationStep ? "text-[1.85rem]" : "text-[2.15rem]",
            )}
          >
            Sizni tanishib olaylik
          </h1>
          <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-muted-foreground">
            Bir necha qadam — keyin sizga yaqin salon va ustalarni tavsiya qilamiz.
          </p>
        </header>

        <div className="mt-5 max-w-[520px]">
          <Stepper steps={[...ONBOARDING_STEPS]} current={step} />
        </div>

        <div key={step} className={cn("mt-6", isLocationStep ? "pb-4" : "py-8")}>
          <OnboardingSteps state={state} variant="desktop" />
        </div>

        <div
          className={cn(
            "sticky bottom-0 z-20 -mx-8 mt-auto flex gap-3 border-t border-border/60 bg-background/95 px-8 py-4 backdrop-blur-md xl:-mx-10 xl:px-10",
            isLocationStep ? "max-w-none" : undefined,
          )}
        >
          {step > 1 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-[1.25rem] border border-border bg-background py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              Orqaga
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canNext || busy}
            onClick={onPrimary}
            className={cn(
              "rounded-[1.25rem] bg-foreground py-3.5 text-sm font-bold tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-40",
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
