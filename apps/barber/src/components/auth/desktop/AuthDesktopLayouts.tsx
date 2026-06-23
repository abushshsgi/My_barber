import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { AuthDesktopFormChrome } from "@/components/auth/desktop/AuthDesktopFormChrome";
import { AuthDesktopHeader } from "@/components/auth/desktop/AuthDesktopHeader";
import type { SignupFlow } from "@/lib/auth-ui";
import { FRAMER_VARIANT_CONFIG } from "@/lib/auth-framer-variants";
import { LIGHT_FORM_SKIN, VARIANT_ACCENT, type AuthDesktopVariant } from "@/lib/auth-desktop-variant";
import { pageEnter } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";

export type AuthDesktopLayoutProps = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep: number;
  onTabChange: (tab: "login" | "signup") => void;
  children: ReactNode;
  variant: AuthDesktopVariant;
};

type ShellProps = Omit<AuthDesktopLayoutProps, "variant">;

function MarketingPanel({ variant }: { variant: AuthDesktopVariant }) {
  const c = FRAMER_VARIANT_CONFIG[variant];
  const isDark = c.textMain.includes("white");

  return (
    <div className={cn("relative flex flex-col justify-center overflow-hidden px-10 py-12 lg:px-16", c.bgLeft)}>
      <motion.div
        className={cn(
          "pointer-events-none absolute -right-20 top-1/4 size-72 rounded-full opacity-40 blur-3xl",
          c.orbPosition,
        )}
        style={{ background: c.glowColor }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 h-px w-full opacity-20"
        style={{ background: `linear-gradient(90deg, transparent, ${c.glowColor}, transparent)` }}
        animate={{ opacity: [0.1, 0.35, 0.1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <motion.div
        {...pageEnter}
        className="relative z-10 max-w-lg"
      >
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
            isDark ? "bg-white/10 text-white/90" : "bg-black/5 text-zinc-600",
          )}
        >
          {c.badge}
        </span>

        <h2
          className={cn(
            "mt-6 text-4xl font-bold leading-[1.08] tracking-tight lg:text-[3.25rem]",
            c.textMain,
          )}
        >
          {c.headline}
          <br />
          <span className={c.highlightClass}>{c.highlight}</span>
        </h2>

        <p className={cn("mt-5 text-base leading-relaxed lg:text-[17px]", isDark ? "text-zinc-400" : "text-zinc-600")}>
          {c.subline}
        </p>

        <ul className="mt-8 space-y-2.5">
          {c.bullets.map((b, i) => (
            <motion.li
              key={b}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className={cn("flex items-center gap-2.5 text-sm font-medium", isDark ? "text-zinc-300" : "text-zinc-700")}
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${c.glowColor}33`, color: c.glowColor }}
              >
                <Check className="size-3 stroke-[3]" />
              </span>
              {b}
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={cn(
            "mt-10 inline-flex items-baseline gap-2 rounded-2xl border px-5 py-3",
            isDark ? "border-white/10 bg-white/5" : "border-black/5 bg-white/60",
          )}
        >
          <span className={cn("text-3xl font-bold tabular-nums", c.highlightClass)}>{c.stat.value}</span>
          <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-500")}>{c.stat.label}</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FramerLayout({ variant, flow, tab, signupStep, onTabChange, children }: ShellProps & { variant: AuthDesktopVariant }) {
  const accent = VARIANT_ACCENT[variant];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <MarketingPanel variant={variant} />
      <div className="flex flex-col justify-center border-l border-black/[0.04] bg-white px-10 py-12 lg:px-16">
        <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} className="mb-6 !px-0 !py-0" />
        <motion.div {...pageEnter} className={cn("max-w-[420px]", LIGHT_FORM_SKIN)}>
          <AuthDesktopFormChrome
            tab={tab}
            signupStep={signupStep}
            flow={flow}
            accent={accent}
            titleSize="compact"
          >
            {children}
          </AuthDesktopFormChrome>
        </motion.div>
        <p className="mt-6 max-w-[420px] text-xs leading-relaxed text-muted-foreground">
          {tab === "login"
            ? "Minglab salon va barberlar allaqachon MySaloon Partner orqali ishlayapti."
            : "Ro'yxatdan o'tish bepul — bir necha daqiqada profilni yoqing."}
        </p>
      </div>
    </div>
  );
}

export function AuthDesktopLayout({ variant, ...props }: AuthDesktopLayoutProps) {
  return <FramerLayout variant={variant} {...props} />;
}
