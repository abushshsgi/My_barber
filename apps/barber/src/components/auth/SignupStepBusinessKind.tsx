import { motion, useReducedMotion } from "framer-motion";
import { Check, Scissors, Sparkles } from "lucide-react";
import { useAuthAccent } from "@/components/auth/AuthAccentContext";
import type { SignupBusinessKind } from "@/lib/auth-ui";
import { ACCENT_STYLES } from "@/lib/auth-desktop-variant";
import { BUSINESS_KIND_META } from "@/lib/barber-flow-config";
import { staggerChild } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";

const KINDS: SignupBusinessKind[] = ["barbershop", "beauty_salon"];

const KIND_ICON: Record<SignupBusinessKind, typeof Scissors> = {
  barbershop: Scissors,
  beauty_salon: Sparkles,
};

type Props = {
  businessKind: SignupBusinessKind | null;
  onSelect: (kind: SignupBusinessKind) => void;
};

export function SignupStepBusinessKind({ businessKind, onSelect }: Props) {
  const reduceMotion = useReducedMotion();
  const accent = useAuthAccent();
  const a = ACCENT_STYLES[accent];

  return (
    <div className="space-y-2">
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:hidden"
      >
        <h2 className="text-sm font-semibold tracking-tight sm:text-base">
          Qanday biznes uchun?
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
          Sartaroshxona yoki go&apos;zallik saloni
        </p>
      </motion.div>

      <div className="space-y-2">
        {KINDS.map((kind, i) => {
          const meta = BUSINESS_KIND_META[kind];
          const Icon = KIND_ICON[kind];
          const selected = businessKind === kind;
          return (
            <motion.div key={kind} {...staggerChild(i, !!reduceMotion)}>
              <motion.button
                type="button"
                onClick={() => onSelect(kind)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all active:scale-[0.99] sm:gap-4 sm:rounded-2xl sm:px-5 sm:py-4",
                  selected
                    ? cn(a.btn, "border-primary text-primary-foreground shadow-md")
                    : "border-border bg-card hover:border-zinc-300 hover:shadow-sm",
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-12",
                    selected ? "bg-primary-foreground/15" : "bg-muted",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold sm:text-[15px]">{meta.title}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs leading-snug sm:mt-1 sm:text-sm",
                      selected ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {meta.subtitle}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                    selected
                      ? "border-primary-foreground bg-primary-foreground text-primary"
                      : "border-border",
                  )}
                >
                  {selected ? <Check className="size-3.5 stroke-[3]" /> : null}
                </span>
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
