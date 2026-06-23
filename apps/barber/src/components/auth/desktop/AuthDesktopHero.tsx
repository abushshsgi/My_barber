import { AnimatePresence, motion } from "framer-motion";
import { Scissors } from "lucide-react";
import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import { cn } from "@/lib/utils";

type Props = {
  flow: SignupFlow | null;
  tone?: "light" | "dark" | "muted";
  compact?: boolean;
};

export function AuthDesktopHero({ flow, tone = "dark", compact }: Props) {
  const meta = flow ? FLOW_IDENTITY_META[flow] : null;
  const titleClass =
    tone === "light"
      ? "text-foreground"
      : tone === "muted"
        ? "text-zinc-900"
        : "text-zinc-100";
  const subClass =
    tone === "light" ? "text-muted-foreground" : tone === "muted" ? "text-zinc-600" : "text-zinc-300";
  const iconWrap =
    tone === "light"
      ? "bg-foreground text-background"
      : tone === "muted"
        ? "bg-zinc-900 text-amber-100"
        : "bg-amber-100 text-zinc-900";

  return (
    <>
      <div className={cn("flex size-10 items-center justify-center rounded-xl", iconWrap)}>
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
          <h1
            className={cn(
              "font-semibold leading-tight tracking-tight",
              compact ? "mt-4 text-2xl" : "mt-6 text-3xl",
              titleClass,
            )}
          >
            {meta ? meta.heroTitle : "MySaloon Partner"}
          </h1>
          <p className={cn("mt-2 max-w-sm text-sm", subClass)}>
            {meta
              ? meta.heroSubtitle
              : "Salon va barber kabineti. Bronlar, mijozlar va daromad — bitta joyda."}
          </p>
          {meta ? (
            <div
              className={cn(
                "mt-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold",
                meta.accentClass,
              )}
            >
              {meta.badge}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
