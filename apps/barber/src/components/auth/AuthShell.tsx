import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AuthStepIndicator } from "@/components/auth/AuthStepIndicator";
import { AuthOnboardingProgress } from "@/components/auth/uzum/AuthOnboardingProgress";
import { AuthUzumBackground } from "@/components/auth/uzum/AuthUzumBackground";
import { AuthUzumCardTitle } from "@/components/auth/uzum/AuthUzumCardTitle";
import { AuthUzumHeader } from "@/components/auth/uzum/AuthUzumHeader";
import { Scissors } from "lucide-react";
import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import { pageEnter } from "@/lib/motion-presets";

type Props = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep?: number;
  onTabChange: (tab: "login" | "signup") => void;
  children: ReactNode;
};

export function AuthShell({ flow, tab, signupStep = 0, onTabChange, children }: Props) {
  const meta = flow ? FLOW_IDENTITY_META[flow] : null;
  const mobileTitle =
    tab === "login"
      ? "Partner kirish"
      : signupStep === 0 && !flow
        ? "Ro'yxatdan o'tish"
        : (meta?.signupTitle ?? "Ro'yxatdan o'tish");

  return (
    <div className="relative min-h-[100dvh] bg-[#eceef2] text-foreground">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md pt-[max(env(safe-area-inset-top),0px)] md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-white">
              <Scissors className="size-3.5" />
            </div>
            <p className="truncate text-sm font-bold">{mobileTitle}</p>
          </div>
          {tab === "signup" ? (
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
              <span className="text-violet-700">{signupStep + 1}</span>/3
            </span>
          ) : null}
        </div>
        {tab === "signup" ? (
          <div className="border-t border-black/5 px-4 py-2">
            <AuthStepIndicator currentStep={signupStep} compact />
          </div>
        ) : null}
      </header>

      {/* Desktop background + top bar */}
      <div className="hidden md:block">
        <AuthUzumBackground />
        <AuthUzumHeader tab={tab} onTabChange={onTabChange} />
      </div>

      {/* Single content tree */}
      <motion.div
        {...pageEnter}
        className="relative px-4 pt-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:flex md:min-h-[calc(100vh-76px)] md:items-center md:justify-center md:px-6 md:pb-12 md:pt-0"
      >
        <div className="w-full md:max-w-[480px] md:rounded-2xl md:bg-white md:px-8 md:py-8 md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
          <div className="hidden md:block">
            <AuthUzumCardTitle tab={tab} signupStep={signupStep} flow={flow} />
            {tab === "signup" ? <AuthOnboardingProgress step={signupStep} /> : null}
          </div>

          {children}

          {tab === "login" ? (
            <p className="mt-6 hidden text-center text-[11px] leading-relaxed text-muted-foreground md:block">
              Tugmani bosish orqali{" "}
              <a href="/privacy" className="text-violet-600 hover:underline">
                Oferta
              </a>{" "}
              va{" "}
              <a href="/privacy" className="text-violet-600 hover:underline">
                Maxfiylik siyosati
              </a>
              ga rozilik bildirasiz.
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
