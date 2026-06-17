import { AnimatePresence, motion } from "framer-motion";
import { Scissors } from "lucide-react";
import type { ReactNode } from "react";
import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import { pageEnter } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";

type Props = {
  flow: SignupFlow | null;
  children: ReactNode;
};

function HeroContent({ flow }: { flow: SignupFlow | null }) {
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
          <h1 className="mt-4 text-xl font-semibold leading-tight sm:mt-6 sm:text-3xl">
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
                "mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold sm:mt-4",
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

export function AuthShell({ flow, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6 pt-safe pb-safe sm:py-10">
      <motion.div
        {...pageEnter}
        className="mx-auto w-full max-w-[960px] rounded-3xl border border-border bg-card shadow-xl overflow-hidden grid md:grid-cols-[1.05fr_0.95fr]"
      >
        {/* Mobile hero strip */}
        <div className="md:hidden bg-zinc-900 text-zinc-100 p-5">
          <HeroContent flow={flow} />
        </div>

        {/* Desktop hero panel */}
        <div className="hidden md:flex flex-col justify-between bg-zinc-900 text-zinc-100 p-8">
          <div>
            <HeroContent flow={flow} />
          </div>
          <div className="text-xs text-zinc-400">MyBarber · Auth Gateway</div>
        </div>

        <div className="p-5 sm:p-8">{children}</div>
      </motion.div>
    </div>
  );
}
