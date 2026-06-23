import type { ReactNode } from "react";
import { AuthStepIndicator } from "@/components/auth/AuthStepIndicator";
import { AuthDesktopLayout } from "@/components/auth/desktop/AuthDesktopLayouts";
import { AuthDesktopVariantPicker } from "@/components/auth/desktop/AuthDesktopVariantPicker";
import { Scissors } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { SignupFlow } from "@/lib/auth-ui";
import type { AuthDesktopVariant } from "@/lib/auth-desktop-variant";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import { pageEnter } from "@/lib/motion-presets";

type Props = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep?: number;
  desktopVariant: AuthDesktopVariant;
  onDesktopVariantChange: (variant: AuthDesktopVariant) => void;
  children: ReactNode;
};

export function AuthShell({
  flow,
  tab,
  signupStep = 0,
  desktopVariant,
  onDesktopVariantChange,
  children,
}: Props) {
  const meta = flow ? FLOW_IDENTITY_META[flow] : null;
  const mobileTitle =
    tab === "login"
      ? "Barber kabineti"
      : signupStep === 0 && !flow
        ? "Ro'yxatdan o'tish"
        : meta?.signupTitle ?? "Ro'yxatdan o'tish";
  const mobileSubtitle =
    tab === "login"
      ? "Kabinetga kirish"
      : signupStep === 0 && !flow
        ? "Avval yo'lingizni tanlang"
        : meta?.badge ?? "Ma'lumotlarni kiriting";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground md:min-h-screen md:bg-zinc-50 md:pt-safe md:pb-safe">
      {/* Mobile */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl md:hidden pt-[max(env(safe-area-inset-top),0px)]">
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-amber-100">
              <Scissors className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight tracking-tight">
                {mobileTitle}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{mobileSubtitle}</p>
            </div>
          </div>
          {tab === "signup" && (
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
              <span className="text-foreground">{signupStep + 1}</span>
              <span className="opacity-50"> / 3</span>
            </span>
          )}
        </div>
        {tab === "signup" && (
          <div className="border-t border-border/40 px-3.5 py-2">
            <AuthStepIndicator currentStep={signupStep} compact />
          </div>
        )}
      </header>

      <div className="md:hidden">
        <motion.div
          {...pageEnter}
          className="px-3.5 pt-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
        >
          {children}
        </motion.div>
      </div>

      {/* Desktop — 5 layout variant */}
      <div className="hidden md:block md:pb-28">
        <AuthDesktopLayout variant={desktopVariant} flow={flow}>
          {children}
        </AuthDesktopLayout>
        <AuthDesktopVariantPicker value={desktopVariant} onChange={onDesktopVariantChange} />
      </div>
    </div>
  );
}
