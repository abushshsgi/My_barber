import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, Quote, Scissors, Sparkles, UserRound } from "lucide-react";
import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import type { AuthAccent } from "@/lib/auth-desktop-variant";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Yo'lingizni tanlang", "Ma'lumotlaringiz", "Tekshirish"] as const;

const FLOW_ICONS = {
  owner: Building2,
  employee: UserRound,
  mybarber: Sparkles,
  independent: Scissors,
} as const;

type Theme =
  | "light"
  | "dark"
  | "intercom"
  | "slack"
  | "emerald"
  | "coral"
  | "gradient"
  | "yellow";

type Props = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep: number;
  theme?: Theme;
  accent?: AuthAccent;
  presentation?: "steps" | "quote" | "stats";
};

const THEME: Record<
  Theme,
  { wrap: string; title: string; sub: string; stepOn: string; stepOff: string; card: string }
> = {
  light: {
    wrap: "text-foreground",
    title: "text-foreground",
    sub: "text-muted-foreground",
    stepOn: "border-foreground bg-foreground text-background",
    stepOff: "border-border bg-muted/50 text-muted-foreground",
    card: "border-border bg-white/80",
  },
  dark: {
    wrap: "text-zinc-100",
    title: "text-white",
    sub: "text-zinc-400",
    stepOn: "border-indigo-400 bg-indigo-400 text-zinc-950",
    stepOff: "border-zinc-700 bg-zinc-800/60 text-zinc-500",
    card: "border-zinc-700 bg-zinc-800/50",
  },
  intercom: {
    wrap: "text-white",
    title: "text-white",
    sub: "text-blue-100/85",
    stepOn: "border-white bg-white text-[#286efa]",
    stepOff: "border-white/25 bg-white/10 text-white/50",
    card: "border-white/20 bg-white/10",
  },
  slack: {
    wrap: "text-purple-100",
    title: "text-white",
    sub: "text-purple-200/75",
    stepOn: "border-[#ecb22e] bg-[#ecb22e] text-[#4a154b]",
    stepOff: "border-purple-400/30 bg-purple-900/40 text-purple-300/50",
    card: "border-purple-400/25 bg-purple-900/30",
  },
  emerald: {
    wrap: "text-zinc-100",
    title: "text-white",
    sub: "text-emerald-200/70",
    stepOn: "border-emerald-400 bg-emerald-400 text-zinc-950",
    stepOff: "border-zinc-700 bg-zinc-800/50 text-zinc-500",
    card: "border-emerald-500/30 bg-emerald-950/40",
  },
  coral: {
    wrap: "text-white",
    title: "text-white",
    sub: "text-orange-100/85",
    stepOn: "border-white bg-white text-[#ff6b4a]",
    stepOff: "border-white/30 bg-white/15 text-white/55",
    card: "border-white/25 bg-white/15",
  },
  gradient: {
    wrap: "text-white",
    title: "text-white",
    sub: "text-white/80",
    stepOn: "border-white bg-white text-purple-700",
    stepOff: "border-white/30 bg-white/15 text-white/55",
    card: "border-white/25 bg-white/15 backdrop-blur-sm",
  },
  yellow: {
    wrap: "text-zinc-900",
    title: "text-zinc-900",
    sub: "text-zinc-600",
    stepOn: "border-[#ffd02f] bg-[#ffd02f] text-zinc-900",
    stepOff: "border-zinc-200 bg-white text-zinc-400",
    card: "border-zinc-200 bg-white shadow-sm",
  },
};

export function AuthDesktopOnboardingAside({
  flow,
  tab,
  signupStep,
  theme = "light",
  accent = "violet",
  presentation = "steps",
}: Props) {
  const t = THEME[theme];
  const meta = flow ? FLOW_IDENTITY_META[flow] : null;
  const FlowIcon = flow ? FLOW_ICONS[flow] : Scissors;

  const headline =
    tab === "login"
      ? "Saloningizni boshqaring"
      : signupStep === 0
        ? "Bir necha daqiqada boshlang"
        : (meta?.signupTitle ?? "Ro'yxatdan o'tish");

  const subline =
    tab === "login"
      ? "Bronlar, jadval va mijozlar — professional panel"
      : signupStep === 0
        ? "To'g'ri yo'lni tanlang, qolganini biz yordam beramiz"
        : (meta?.signupNextStep ?? "Yakuniy qadam");

  return (
    <div className={cn("flex h-full flex-col justify-between", t.wrap)}>
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${signupStep}-${flow ?? "x"}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {presentation === "quote" && tab === "login" ? (
              <Quote className="mb-4 size-8 opacity-40" />
            ) : null}
            <h2 className={cn("text-2xl font-bold leading-tight tracking-tight lg:text-3xl", t.title)}>
              {headline}
            </h2>
            <p className={cn("mt-3 max-w-md text-sm leading-relaxed lg:text-[15px]", t.sub)}>{subline}</p>
          </motion.div>
        </AnimatePresence>

        {presentation === "steps" && tab === "signup" && (
          <ol className="mt-10 space-y-4">
            {STEP_LABELS.map((label, i) => {
              const done = i < signupStep;
              const active = i === signupStep;
              return (
                <motion.li
                  key={label}
                  initial={false}
                  animate={{ opacity: i <= signupStep ? 1 : 0.4, x: active ? 6 : 0 }}
                  className="flex items-center gap-3"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                      done || active ? t.stepOn : t.stepOff,
                    )}
                  >
                    {done ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span className={cn("text-sm font-medium", active ? t.title : t.sub)}>{label}</span>
                </motion.li>
              );
            })}
          </ol>
        )}

        {presentation === "quote" && tab === "login" && (
          <blockquote className={cn("mt-8 border-l-2 pl-4 text-sm italic leading-relaxed", t.sub)}>
            «MySaloon orqali bronlar 40% oshdi — mijozlar o'zlari vaqtni tanlaydi.»
            <footer className="mt-2 text-xs not-italic opacity-70">— Salon egasi, Toshkent</footer>
          </blockquote>
        )}
      </div>

      {flow && tab === "signup" && meta && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("mt-8 rounded-2xl border p-4", t.card)}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-white">
              <FlowIcon className="size-5" />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", t.title)}>{meta.title}</p>
              <p className={cn("text-xs", t.sub)}>{meta.benefit}</p>
            </div>
          </div>
        </motion.div>
      )}

      {presentation === "stats" && tab === "login" && (
        <div className="mt-auto grid grid-cols-2 gap-6 pt-8">
          {[
            { value: "2.4k+", label: "Barberlar" },
            { value: "18k+", label: "Bron / oy" },
          ].map((s) => (
            <div key={s.label}>
              <p className={cn("text-2xl font-bold", t.title)}>{s.value}</p>
              <p className={cn("text-xs uppercase tracking-wide", t.sub)}>{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
