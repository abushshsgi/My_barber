import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { AuthMobileStickyBar } from "@/components/auth/AuthMobileStickyBar";
import { AuthStepIndicator } from "@/components/auth/AuthStepIndicator";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { SignupStepFlow } from "@/components/auth/SignupStepFlow";
import { SignupStepIdentity } from "@/components/auth/SignupStepIdentity";
import { SignupStepReview } from "@/components/auth/SignupStepReview";
import type { SignupFlow } from "@/lib/auth-ui";
import { validateEmailField, validateSignupIdentity } from "@/lib/auth-ui";
import { cn } from "@/lib/utils";

export type SignupWizardData = {
  name: string;
  phone: string;
  email: string;
  password: string;
  flow: SignupFlow | null;
};

type Props = {
  step: number;
  data: SignupWizardData;
  error: string | null;
  loading: boolean;
  checkingAvailability?: boolean;
  emailError: string | null;
  phoneError: string | null;
  onStepChange: (step: number) => void;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onFlowSelect: (flow: SignupFlow) => void;
  onEmailBlur: () => void;
  onPhoneBlur: () => void;
  onSubmit: () => void;
  onClearError: () => void;
  onStep1Next?: () => Promise<boolean>;
};

const STEP_EASE = [0.22, 1, 0.36, 1] as const;

function stepMotion(reduceMotion: boolean, direction: "forward" | "back") {
  const offset = direction === "forward" ? 24 : -24;
  return {
    initial: { opacity: 0, y: reduceMotion ? 0 : offset },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduceMotion ? 0 : -offset / 2 },
    transition: { duration: reduceMotion ? 0 : 0.38, ease: STEP_EASE },
  };
}

function ActionBar({
  step,
  canNext,
  loading,
  onBack,
  onNext,
  nextLabel,
  disabledTooltip,
  className,
}: {
  step: number;
  canNext: boolean;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  disabledTooltip?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0 || loading}
          className={cn(
            "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-all",
            step === 0 ? "cursor-not-allowed opacity-40" : "hover:bg-muted active:scale-[0.98]",
          )}
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Orqaga</span>
        </button>

        <div className="hidden flex-1 justify-center sm:flex lg:hidden">
          <AuthStepIndicator currentStep={step} />
        </div>

        <AuthSubmitButton
          type="button"
          variant="brand"
          onClick={onNext}
          loading={loading}
          disabled={!canNext}
          disabledTooltip={disabledTooltip}
          className="h-11 w-auto min-w-[9.5rem] shrink-0 rounded-xl px-6 text-sm max-md:min-w-0 max-md:flex-1"
        >
          {nextLabel}
        </AuthSubmitButton>
      </div>
    </div>
  );
}

export function SignupWizard({
  step,
  data,
  error,
  loading,
  checkingAvailability = false,
  emailError,
  phoneError,
  onStepChange,
  onNameChange,
  onPhoneChange,
  onEmailChange,
  onPasswordChange,
  onFlowSelect,
  onEmailBlur,
  onPhoneBlur,
  onSubmit,
  onClearError,
  onStep1Next,
}: Props) {
  const reduceMotion = useReducedMotion();

  const canStep0 = data.flow !== null;
  const step1Validation = validateSignupIdentity({
    fullName: data.name,
    phone: data.phone,
    email: data.email,
    password: data.password,
    flow: data.flow ?? "owner",
  });
  const canStep1 = step1Validation === null && !checkingAvailability;

  const handleNext = async () => {
    onClearError();
    if (step === 0) {
      if (!canStep0) return;
      onStepChange(1);
      return;
    }
    if (step === 1) {
      if (step1Validation) return;
      if (onStep1Next) {
        const ok = await onStep1Next();
        if (!ok) return;
      }
      onStepChange(2);
      return;
    }
    if (step === 2) {
      onSubmit();
    }
  };

  const handleBack = () => {
    onClearError();
    if (step > 0) onStepChange(step - 1);
  };

  const canNext = step === 0 ? canStep0 : step === 1 ? canStep1 : true;
  const nextLabel =
    step === 0
      ? data.flow
        ? "Keyingisi"
        : "Yo'lni tanlang"
      : step === 2
        ? loading
          ? "Kutilmoqda..."
          : "Davom etish"
        : "Keyingisi";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden lg:pb-0">
      <AnimatePresence mode="wait" custom={step}>
        <motion.div key={step} {...stepMotion(!!reduceMotion, "forward")} className="min-h-0 shrink overflow-hidden">
          {step === 0 && <SignupStepFlow flow={data.flow} onSelect={onFlowSelect} />}
          {step === 1 && (
            <SignupStepIdentity
              name={data.name}
              phone={data.phone}
              email={data.email}
              password={data.password}
              emailError={emailError}
              phoneError={phoneError}
              checkingAvailability={checkingAvailability}
              onNameChange={onNameChange}
              onPhoneChange={onPhoneChange}
              onEmailChange={onEmailChange}
              onPasswordChange={onPasswordChange}
              onEmailBlur={onEmailBlur}
              onPhoneBlur={onPhoneBlur}
            />
          )}
          {step === 2 && data.flow && (
            <SignupStepReview
              name={data.name}
              phone={data.phone}
              email={data.email}
              flow={data.flow}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 shrink-0 space-y-3">
        <AuthErrorAlert error={error} />

        <div className="hidden border-t border-border/60 pt-4 lg:block">
          <ActionBar
            step={step}
            canNext={canNext}
            loading={loading || checkingAvailability}
            onBack={handleBack}
            onNext={handleNext}
            nextLabel={nextLabel}
            disabledTooltip={
              step === 0
                ? "Avval signup yo'lini tanlang"
                : step === 1 && step1Validation
                  ? step1Validation
                  : undefined
            }
          />
        </div>
      </div>

      <AuthMobileStickyBar>
        <ActionBar
          step={step}
          canNext={canNext}
          loading={loading || checkingAvailability}
          onBack={handleBack}
          onNext={handleNext}
          nextLabel={nextLabel}
          disabledTooltip={
            step === 0
              ? "Avval signup yo'lini tanlang"
              : step === 1 && step1Validation
                ? step1Validation
                : undefined
          }
          className="w-full"
        />
      </AuthMobileStickyBar>
    </div>
  );
}
