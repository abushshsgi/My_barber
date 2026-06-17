import { AnimatePresence, motion } from "framer-motion";
import { Scissors } from "lucide-react";
import type { ReactNode } from "react";
import { AuthStepIndicator } from "@/components/auth/AuthStepIndicator";
import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import { pageEnter } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";

type Props = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep?: number;
  children: ReactNode;
};

function DesktopHero({ flow }: { flow: SignupFlow | null }) {
  const meta = flow ? FLOW_IDENTITY_META[flow] : null;

  return (
    <>
      <div className="size-10 rounded-xl bg-amber-100 text-zinc-900 flex items-center justify-center">
        <Scissors className="size-5" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={flow ?? "default"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <h1 className="mt-6 text-3xl font-semibold leading-tight">
            {meta ? meta.heroTitle : "Barber kabineti"}
          </h1>
          <p className="mt-2 text-sm text-zinc-300 max-w-sm">
            {meta
              ? meta.heroSubtitle
              : "Xavfsiz autentifikatsiya oqimi. Kirish yoki ro'yxatdan o'tishni tanlang."}
          </p>
          {meta && (
            <div
              className={cn(
                "mt-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold",
                meta.accentClass,
              )}
            >
              {meta.badge}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export function AuthShell({ flow, tab, signupStep = 0, children }: Props) {
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
    <div className="min-h-[100dvh] bg-background text-foreground md:min-h-screen md:px-4 md:py-10 md:pt-safe md:pb-safe">
      {/* Mobile sticky header */}
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

      <motion.div
        {...pageEnter}
        className="mx-auto w-full max-w-[960px] md:overflow-hidden md:rounded-3xl md:border md:border-border md:bg-card md:shadow-xl md:grid md:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="hidden flex-col justify-between bg-zinc-900 p-8 text-zinc-100 md:flex">
          <div>
            <DesktopHero flow={flow} />
          </div>
          <div className="text-xs text-zinc-400">MyBarber · Auth Gateway</div>
        </div>

        <div className="px-3.5 pt-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:p-8 md:pb-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
