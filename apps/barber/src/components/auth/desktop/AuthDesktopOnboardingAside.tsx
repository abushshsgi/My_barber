import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, Scissors, Sparkles, UserRound } from "lucide-react";
import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Yo'lingizni tanlang", "Ma'lumotlaringiz", "Tekshirish va davom"] as const;

const FLOW_ICONS = {
  owner: Building2,
  employee: UserRound,
  mybarber: Sparkles,
  independent: Scissors,
} as const;

export type AsideTheme =
  | "dark"
  | "light"
  | "warm"
  | "amber"
  | "ink"
  | "sand"
  | "copper"
  | "midnight"
  | "lounge";

type Props = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep: number;
  theme: AsideTheme;
  /** steps | quote | timeline | cards */
  presentation?: "steps" | "quote" | "timeline" | "cards";
};

const THEME_STYLES: Record<
  AsideTheme,
  { title: string; sub: string; badge: string; stepActive: string; stepDone: string; stepIdle: string }
> = {
  dark: {
    title: "text-zinc-100",
    sub: "text-zinc-400",
    badge: "border-white/20 bg-white/10 text-zinc-100",
    stepActive: "border-amber-300 bg-amber-300 text-zinc-900",
    stepDone: "border-white/30 bg-white/10 text-white",
    stepIdle: "border-white/10 bg-transparent text-zinc-500",
  },
  light: {
    title: "text-zinc-900",
    sub: "text-zinc-600",
    badge: "border-border bg-card text-foreground",
    stepActive: "border-foreground bg-foreground text-background",
    stepDone: "border-foreground/30 bg-zinc-100 text-foreground",
    stepIdle: "border-border bg-muted/40 text-muted-foreground",
  },
  warm: {
    title: "text-zinc-900",
    sub: "text-zinc-600",
    badge: "border-amber-600/30 bg-amber-100 text-amber-900",
    stepActive: "border-amber-600 bg-amber-600 text-white",
    stepDone: "border-amber-400/50 bg-amber-50 text-amber-900",
    stepIdle: "border-amber-200 bg-white/60 text-amber-800/50",
  },
  amber: {
    title: "text-white",
    sub: "text-amber-100/85",
    badge: "border-amber-200/40 bg-amber-400/20 text-amber-50",
    stepActive: "border-white bg-white text-amber-700",
    stepDone: "border-amber-200/50 bg-amber-500/30 text-white",
    stepIdle: "border-white/15 bg-white/5 text-amber-100/50",
  },
  ink: {
    title: "text-stone-100",
    sub: "text-stone-400",
    badge: "border-stone-500/40 bg-stone-800 text-stone-100",
    stepActive: "border-amber-400 bg-amber-400 text-stone-950",
    stepDone: "border-stone-500 bg-stone-800 text-stone-200",
    stepIdle: "border-stone-700 bg-stone-900/50 text-stone-600",
  },
  sand: {
    title: "text-stone-900",
    sub: "text-stone-600",
    badge: "border-stone-300 bg-stone-100 text-stone-800",
    stepActive: "border-stone-900 bg-stone-900 text-stone-50",
    stepDone: "border-stone-400 bg-stone-200 text-stone-800",
    stepIdle: "border-stone-200 bg-stone-50 text-stone-500",
  },
  copper: {
    title: "text-orange-50",
    sub: "text-orange-100/80",
    badge: "border-orange-200/30 bg-orange-500/25 text-orange-50",
    stepActive: "border-orange-100 bg-orange-100 text-orange-950",
    stepDone: "border-orange-300/40 bg-orange-600/40 text-white",
    stepIdle: "border-orange-400/20 bg-orange-950/30 text-orange-200/40",
  },
  midnight: {
    title: "text-sky-50",
    sub: "text-sky-200/70",
    badge: "border-sky-400/30 bg-sky-950/60 text-sky-100",
    stepActive: "border-amber-300 bg-amber-300 text-slate-950",
    stepDone: "border-sky-500/40 bg-sky-900/80 text-sky-100",
    stepIdle: "border-slate-700 bg-slate-900/40 text-slate-500",
  },
  lounge: {
    title: "text-amber-50",
    sub: "text-amber-100/70",
    badge: "border-amber-700/50 bg-amber-950/80 text-amber-200",
    stepActive: "border-amber-400 bg-amber-400 text-zinc-950",
    stepDone: "border-amber-800 bg-amber-950 text-amber-200",
    stepIdle: "border-amber-900/60 bg-zinc-950 text-amber-900",
  },
};

function FlowBenefits({ flow }: { flow: SignupFlow }) {
  const meta = FLOW_IDENTITY_META[flow];
  const Icon = FLOW_ICONS[flow];
  const items = [meta.benefit, meta.signupSubtitle, meta.signupNextStep];

  return (
    <ul className="mt-6 space-y-2.5">
      {items.map((text) => (
        <li key={text} className="flex items-start gap-2.5 text-sm leading-snug opacity-90">
          <Icon className="mt-0.5 size-4 shrink-0 opacity-70" />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function StepList({
  signupStep,
  theme,
  presentation,
}: {
  signupStep: number;
  theme: AsideTheme;
  presentation: Props["presentation"];
}) {
  const s = THEME_STYLES[theme];

  if (presentation === "timeline") {
    return (
      <ol className="relative mt-8 space-y-0 border-l border-current/15 pl-5">
        {STEP_LABELS.map((label, i) => {
          const state = i < signupStep ? "done" : i === signupStep ? "active" : "idle";
          return (
            <li key={label} className="relative pb-6 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[calc(0.625rem+1px)] top-0.5 flex size-5 items-center justify-center rounded-full border text-[10px] font-bold",
                  state === "active" && s.stepActive,
                  state === "done" && s.stepDone,
                  state === "idle" && s.stepIdle,
                )}
              >
                {state === "done" ? <Check className="size-3" /> : i + 1}
              </span>
              <p className={cn("text-sm font-semibold", state === "idle" ? "opacity-50" : "")}>{label}</p>
            </li>
          );
        })}
      </ol>
    );
  }

  if (presentation === "cards") {
    return (
      <div className="mt-6 grid gap-2">
        {STEP_LABELS.map((label, i) => {
          const state = i < signupStep ? "done" : i === signupStep ? "active" : "idle";
          return (
            <div
              key={label}
              className={cn(
                "rounded-xl border px-3.5 py-3 transition-colors",
                state === "active" && s.stepActive,
                state === "done" && s.stepDone,
                state === "idle" && s.stepIdle,
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Qadam {i + 1}</p>
              <p className="mt-0.5 text-sm font-semibold">{label}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {STEP_LABELS.map((label, i) => {
        const state = i < signupStep ? "done" : i === signupStep ? "active" : "idle";
        return (
          <span
            key={label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
              state === "active" && s.stepActive,
              state === "done" && s.stepDone,
              state === "idle" && s.stepIdle,
            )}
          >
            {state === "done" ? <Check className="size-3" /> : <span className="tabular-nums">{i + 1}</span>}
            <span className="hidden lg:inline">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function AuthDesktopOnboardingAside({
  flow,
  tab,
  signupStep,
  theme,
  presentation = "steps",
}: Props) {
  const s = THEME_STYLES[theme];
  const meta = flow ? FLOW_IDENTITY_META[flow] : null;
  const isSignup = tab === "signup";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${tab}-${flow ?? "none"}-${signupStep}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28 }}
        className="relative"
      >
        <p className={cn("text-[11px] font-bold uppercase tracking-[0.22em]", s.sub)}>
          {isSignup ? "Ro'yxatdan o'tish" : "Partner kirish"}
        </p>

        <h2 className={cn("mt-3 text-2xl font-semibold leading-tight tracking-tight lg:text-3xl", s.title)}>
          {isSignup
            ? flow
              ? meta?.heroTitle
              : "Qaysi yo'l sizga mos?"
            : "MySaloon Partner kabineti"}
        </h2>

        <p className={cn("mt-2 max-w-md text-sm leading-relaxed", s.sub)}>
          {isSignup
            ? flow
              ? signupStep === 2
                ? meta?.successBody
                : signupStep === 1
                  ? meta?.signupNextStep
                  : meta?.heroSubtitle
              : "Salon egasi, ishchi, MyBarber yoki mustaqil barber — bir necha daqiqada boshlang."
            : "Bronlar, mijozlar, chat va daromad — barchasi bitta professional panelda."}
        </p>

        {flow && meta ? (
          <div className={cn("mt-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold", meta.accentClass)}>
            {meta.badge}
          </div>
        ) : null}

        {isSignup ? (
          <>
            <StepList signupStep={signupStep} theme={theme} presentation={presentation} />
            {flow ? <FlowBenefits flow={flow} /> : null}
            {!flow && signupStep === 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-2 text-left">
                {(Object.keys(FLOW_IDENTITY_META) as SignupFlow[]).map((f) => {
                  const m = FLOW_IDENTITY_META[f];
                  const Icon = FLOW_ICONS[f];
                  return (
                    <div
                      key={f}
                      className={cn(
                        "rounded-xl border px-3 py-2.5",
                        theme === "light" || theme === "sand" || theme === "warm"
                          ? "border-border/80 bg-white/70"
                          : "border-white/10 bg-white/5",
                      )}
                    >
                      <Icon className={cn("size-4", s.sub)} />
                      <p className={cn("mt-1.5 text-xs font-bold", s.title)}>{m.signupTitle}</p>
                      <p className={cn("mt-0.5 text-[10px] leading-snug", s.sub)}>{m.signupSubtitle}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <ul className={cn("mt-8 space-y-2 text-sm", s.sub)}>
            <li>· Real vaqt bronlar va kalendar</li>
            <li>· Mijozlar bilan chat</li>
            <li>· Daromad va statistika</li>
          </ul>
        )}

        {presentation === "quote" && flow && meta ? (
          <blockquote className={cn("mt-8 border-l-2 pl-4 text-lg font-medium leading-snug", s.title)}>
            «{meta.successTitle}»
          </blockquote>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
