import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, Scissors, Sparkles, UserRound } from "lucide-react";
import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import type { AuthAccent } from "@/lib/auth-desktop-variant";
import { ACCENT_STYLES } from "@/lib/auth-desktop-variant";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Yo'lingizni tanlang", "Ma'lumotlaringiz", "Tekshirish"] as const;

const FLOW_ICONS = {
  owner: Building2,
  employee: UserRound,
  mybarber: Sparkles,
  independent: Scissors,
} as const;

type Theme = "light" | "violet" | "slate" | "dark";

type Props = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep: number;
  theme?: Theme;
  accent?: AuthAccent;
};

const THEME_CLASS: Record<Theme, { wrap: string; title: string; sub: string; stepOn: string; stepOff: string }> = {
  light: {
    wrap: "text-foreground",
    title: "text-foreground",
    sub: "text-muted-foreground",
    stepOn: "border-violet-600 bg-violet-600 text-white",
    stepOff: "border-zinc-200 bg-white text-muted-foreground",
  },
  violet: {
    wrap: "text-violet-50",
    title: "text-white",
    sub: "text-violet-100/80",
    stepOn: "border-white bg-white text-violet-700",
    stepOff: "border-violet-300/30 bg-violet-500/20 text-violet-100/60",
  },
  slate: {
    wrap: "text-slate-800",
    title: "text-slate-900",
    sub: "text-slate-600",
    stepOn: "border-slate-800 bg-slate-800 text-white",
    stepOff: "border-slate-200 bg-white/70 text-slate-500",
  },
  dark: {
    wrap: "text-zinc-100",
    title: "text-white",
    sub: "text-zinc-400",
    stepOn: "border-violet-400 bg-violet-400 text-zinc-950",
    stepOff: "border-zinc-700 bg-zinc-800/50 text-zinc-500",
  },
};

export function AuthDesktopOnboardingAside({
  flow,
  tab,
  signupStep,
  theme = "light",
  accent = "violet",
}: Props) {
  const t = THEME_CLASS[theme];
  const accentText = ACCENT_STYLES[accent].text;
  const meta = flow ? FLOW_IDENTITY_META[flow] : null;
  const FlowIcon = flow ? FLOW_ICONS[flow] : Scissors;

  const headline =
    tab === "login"
      ? "Partner kabineti"
      : signupStep === 0
        ? "MySaloon bilan o'sing"
        : meta?.signupTitle ?? "Ro'yxatdan o'tish";

  const subline =
    tab === "login"
      ? "Bronlar, mijozlar va daromad — bitta joyda"
      : signupStep === 0
        ? "Salon yoki mustaqil barber sifatida boshlang"
        : meta?.signupNextStep ?? "Bir necha qadam qoldi";

  return (
    <div className={cn("flex h-full flex-col justify-between", t.wrap)}>
      <div>
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em] opacity-70", t.sub)}>
          MySaloon Partners
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${signupStep}-${flow ?? "x"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4"
          >
            <h2 className={cn("text-2xl font-bold leading-tight tracking-tight", t.title)}>{headline}</h2>
            <p className={cn("mt-2 max-w-sm text-sm leading-relaxed", t.sub)}>{subline}</p>
          </motion.div>
        </AnimatePresence>

        {tab === "signup" && (
          <ol className="mt-8 space-y-3">
            {STEP_LABELS.map((label, i) => {
              const done = i < signupStep;
              const active = i === signupStep;
              return (
                <motion.li
                  key={label}
                  initial={false}
                  animate={{ opacity: i <= signupStep ? 1 : 0.45, x: active ? 4 : 0 }}
                  transition={{ duration: 0.28 }}
                  className="flex items-center gap-3"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors",
                      done || active ? t.stepOn : t.stepOff,
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      active ? t.title : t.sub,
                      active && theme === "light" && accentText,
                    )}
                  >
                    {label}
                  </span>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>

      {flow && tab === "signup" && meta && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mt-6 rounded-2xl border p-4",
            theme === "violet" ? "border-white/20 bg-white/10" : "border-border bg-white/60",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                theme === "violet" ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700",
              )}
            >
              <FlowIcon className="size-5" />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", t.title)}>{meta.title}</p>
              <p className={cn("text-xs", t.sub)}>{meta.benefit}</p>
            </div>
          </div>
        </motion.div>
      )}

      {tab === "login" && (
        <div className="mt-auto grid grid-cols-2 gap-4 border-t border-black/5 pt-6">
          {[
            { value: "2.4k+", label: "Faol barberlar" },
            { value: "18k+", label: "Oylik bronlar" },
          ].map((s) => (
            <div key={s.label}>
              <p className={cn("text-lg font-bold", theme === "violet" ? "text-white" : accentText)}>
                {s.value}
              </p>
              <p className={cn("text-[10px] uppercase tracking-wide", t.sub)}>{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
