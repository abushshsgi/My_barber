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
import { stepTransition } from "@/lib/motion-presets";
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
};

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
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0 || loading}
          className={cn(
            "inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-sm font-medium text-foreground transition-[var(--transition-smooth)] md:h-11 md:w-auto md:rounded-xl md:px-4",
            step === 0 ? "cursor-not-allowed opacity-40" : "hover:bg-muted active:scale-[0.98]",
          )}
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Orqaga</span>
        </button>

        <div className="hidden flex-1 sm:flex sm:justify-center">
          <AuthStepIndicator currentStep={step} />
        </div>

        <AuthSubmitButton
          type="button"
          onClick={onNext}
          loading={loading}
          disabled={!canNext}
          disabledTooltip={disabledTooltip}
          className="h-12 min-w-0 flex-1 rounded-full text-[15px] md:min-w-[170px] md:flex-none md:rounded-xl md:text-sm"
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
}: Props) {
  const reduceMotion = useReducedMotion();
  const transition = stepTransition(!!reduceMotion);

  const canStep0 = data.flow !== null;
  const canStep1 =
    validateSignupIdentity({
      fullName: data.name,
      phone: data.phone,
      email: data.email,
      password: data.password,
      flow: data.flow ?? "owner",
    }) === null &&
    !emailError &&
    !phoneError &&
    !checkingAvailability;

  const handleNext = () => {
    onClearError();
    if (step === 0) {
      if (!canStep0) return;
      onStepChange(1);
      return;
    }
    if (step === 1) {
      const emailErr = validateEmailField(data.email);
      if (emailErr) return;
      const validation = validateSignupIdentity({
        fullName: data.name,
        phone: data.phone,
        email: data.email,
        password: data.password,
        flow: data.flow ?? "owner",
      });
      if (validation) return;
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
    <div className="md:pb-0">
      <div className="mb-4 hidden md:block">
        <AuthStepIndicator currentStep={step} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} {...transition} className="min-h-[280px]">
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

      <div className="mt-4 space-y-4">
        <AuthErrorAlert error={error} />

        {/* Desktop inline actions */}
        <div className="hidden md:block">
          <ActionBar
            step={step}
            canNext={canNext}
            loading={loading || checkingAvailability}
            onBack={handleBack}
            onNext={handleNext}
            nextLabel={nextLabel}
            disabledTooltip={step === 0 ? "Avval signup yo'lini tanlang" : undefined}
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
          disabledTooltip={step === 0 ? "Avval signup yo'lini tanlang" : undefined}
          className="w-full"
        />
      </AuthMobileStickyBar>
    </div>
  );
}
