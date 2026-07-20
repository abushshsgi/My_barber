import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AuthStepIndicator } from "@/components/auth/AuthStepIndicator";
import { AuthDesktopLayout } from "@/components/auth/desktop/AuthDesktopLayouts";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
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
      : signupStep === 0
        ? "Biznes turi"
        : signupStep === 1 && !flow
          ? "Ro'yxatdan o'tish"
          : (meta?.signupTitle ?? "Ro'yxatdan o'tish");

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.height = "100dvh";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
    };
  }, []);

  return (
    <div className="auth-viewport relative flex flex-col bg-[#f4f4f5] text-foreground lg:bg-transparent">
      <header className="z-50 shrink-0 border-b border-black/5 bg-white/90 backdrop-blur-md pt-[max(env(safe-area-inset-top),0px)] lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <MysaloonLogo size="sm" />
            <p className="truncate text-sm font-bold">{mobileTitle}</p>
          </div>
          {tab === "signup" ? (
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
              <span className="text-primary">{signupStep + 1}</span>/4
            </span>
          ) : null}
        </div>
        {tab === "signup" ? (
          <div className="border-t border-black/5 px-4 py-1.5">
            <AuthStepIndicator currentStep={signupStep} totalSteps={4} compact />
          </div>
        ) : null}
      </header>

      <motion.div
        {...pageEnter}
        className="auth-viewport-scroll flex min-h-0 flex-1 flex-col px-4 pt-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden">{children}</div>
      </motion.div>

      <div className="auth-viewport hidden h-full min-h-0 w-full lg:flex">
        <AuthDesktopLayout flow={flow} tab={tab} signupStep={signupStep} onTabChange={onTabChange}>
          {children}
        </AuthDesktopLayout>
      </div>
    </div>
  );
}
