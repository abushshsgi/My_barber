import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarClock, MapPin, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AuthAiIllustration,
  AuthBookIllustration,
  AuthMapIllustration,
} from "@/components/auth/AuthMarketingIllustrations";

const FEATURES = [
  { key: "featureMap", icon: MapPin },
  { key: "featureBook", icon: CalendarClock },
  { key: "featureAi", icon: Sparkles },
] as const;

const ILLUSTRATIONS = {
  map: AuthMapIllustration,
  book: AuthBookIllustration,
  ai: AuthAiIllustration,
} as const;

type VisualPhase = keyof typeof ILLUSTRATIONS;
type Phase = "hero" | VisualPhase;

const PHASE_ORDER: Phase[] = ["hero", "map", "book", "ai"];
const PHASE_DELAYS: Record<Phase, number> = {
  hero: 0,
  map: 1400,
  book: 4200,
  ai: 7000,
};

const EASE = [0.22, 1, 0.36, 1] as const;

function useAuthMarketingPhase(): Phase {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? "ai" : "hero");

  useEffect(() => {
    if (reduced) return;

    const timers = PHASE_ORDER.slice(1).map((next) =>
      window.setTimeout(() => setPhase(next), PHASE_DELAYS[next]),
    );

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [reduced]);

  return phase;
}

function phaseIndex(phase: Phase) {
  return PHASE_ORDER.indexOf(phase);
}

export function AuthMarketingPanel() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const phase = useAuthMarketingPhase();
  const showVisual = phase !== "hero";
  const activeVisual: VisualPhase = phase === "hero" ? "map" : phase;
  const activeFeatureIndex = phase === "hero" ? -1 : phaseIndex(phase) - 1;
  const ActiveIllustration = ILLUSTRATIONS[activeVisual];

  return (
    <div className="relative hidden min-h-[100dvh] flex-col overflow-hidden bg-surface p-8 xl:p-10 lg:flex">
      <div
        className="auth-blob-drift pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-foreground/[0.04] blur-3xl"
        aria-hidden
      />
      <div
        className="auth-blob-drift-slow pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-foreground/[0.03] blur-3xl"
        aria-hidden
      />

      <div className="relative flex min-h-full flex-col justify-between">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight xl:text-3xl">mysaloon</span>
            <span className="text-base font-bold text-muted-foreground">.uz</span>
          </div>
        </motion.div>

        <div className="my-6 flex max-w-md flex-1 flex-col justify-center py-2">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <h2 className="text-[clamp(1.875rem,3vw,2.75rem)] font-bold leading-[1.08] tracking-tight text-foreground">
              {t("home.title")}
            </h2>
            <motion.p
              className="mt-4 max-w-sm text-base font-medium leading-relaxed text-muted-foreground xl:text-lg"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : 0.18, ease: EASE }}
            >
              {t("homePage.editorialTagline")}
            </motion.p>
          </motion.div>

          <motion.div
            className="relative overflow-hidden rounded-[22px] border border-border/70 bg-background/50 text-foreground backdrop-blur-sm"
            initial={false}
            animate={{
              height: showVisual ? 188 : 0,
              opacity: showVisual ? 1 : 0,
              marginTop: showVisual ? 24 : 0,
            }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="relative h-[188px]">
              <AnimatePresence mode="wait">
                {showVisual ? (
                  <motion.div
                    key={activeVisual}
                    className="absolute inset-0 p-3"
                    initial={reduced ? false : { opacity: 0, scale: 0.96, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
                    transition={{ duration: 0.55, ease: EASE }}
                  >
                    <ActiveIllustration />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>

          <ul className="mt-5 space-y-2.5" aria-live="polite">
            {FEATURES.map(({ key, icon: Icon }, index) => {
              const visible = reduced || phaseIndex(phase) > index;
              const active = activeFeatureIndex === index;

              return (
                <motion.li
                  key={key}
                  initial={false}
                  animate={{
                    opacity: visible ? 1 : 0,
                    x: visible ? 0 : -14,
                    height: visible ? "auto" : 0,
                  }}
                  transition={{ duration: 0.48, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-[background-color,border-color,box-shadow] duration-300 ${
                      active
                        ? "border-foreground/20 bg-background shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
                        : "border-border/60 bg-background/45"
                    }`}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-lg text-background transition-colors duration-300 ${
                        active ? "bg-foreground" : "bg-foreground/75"
                      }`}
                    >
                      <Icon className="size-4" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {t(`auth.marketing.${key}`)}
                      </p>
                    </div>
                    {active && !reduced ? (
                      <motion.span
                        className="size-2 shrink-0 rounded-full bg-foreground"
                        layoutId="auth-feature-active"
                        transition={{ type: "spring", stiffness: 420, damping: 28 }}
                      />
                    ) : null}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>

        <motion.p
          className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduced ? 0 : 0.35, ease: EASE }}
        >
          {t("footer.tagline")}
        </motion.p>
      </div>
    </div>
  );
}
