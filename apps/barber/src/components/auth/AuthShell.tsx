import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AuthStepIndicator } from "@/components/auth/AuthStepIndicator";
import { AuthDesktopLayout } from "@/components/auth/desktop/AuthDesktopLayouts";
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
    <div className="relative min-h-[100dvh] bg-[#f4f4f5] text-foreground md:bg-transparent">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md pt-[max(env(safe-area-inset-top),0px)] md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="size-3.5" />
            </div>
            <p className="truncate text-sm font-bold">{mobileTitle}</p>
          </div>
          {tab === "signup" ? (
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
              <span className="text-primary">{signupStep + 1}</span>/3
            </span>
          ) : null}
        </div>
        {tab === "signup" ? (
          <div className="border-t border-black/5 px-4 py-2">
            <AuthStepIndicator currentStep={signupStep} compact />
          </div>
        ) : null}
      </header>

      <motion.div
        {...pageEnter}
        className="px-4 pt-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:hidden"
      >
        {children}
      </motion.div>

      <div className="hidden md:block">
        <AuthDesktopLayout flow={flow} tab={tab} signupStep={signupStep} onTabChange={onTabChange}>
          {children}
        </AuthDesktopLayout>
      </div>
    </div>
  );
}
