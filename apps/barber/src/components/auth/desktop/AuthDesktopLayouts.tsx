import { motion } from "framer-motion";
import { Check, Scissors } from "lucide-react";
import type { ReactNode } from "react";
import { AuthAccentProvider } from "@/components/auth/AuthAccentContext";
import { AuthDesktopFormChrome } from "@/components/auth/desktop/AuthDesktopFormChrome";
import { AuthDesktopTabSwitcher } from "@/components/auth/desktop/AuthDesktopTabSwitcher";
import type { SignupFlow } from "@/lib/auth-ui";
import { FRAMER_VARIANT_CONFIG } from "@/lib/auth-framer-variants";
import {
  ACCENT_STYLES,
  LIGHT_FORM_SKIN,
  VARIANT_ACCENT,
  type AuthDesktopVariant,
} from "@/lib/auth-desktop-variant";
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

function UnifiedAuthCard({
  variant,
  tab,
  signupStep,
  flow,
  onTabChange,
  children,
}: ShellProps & { variant: AuthDesktopVariant }) {
  const c = FRAMER_VARIANT_CONFIG[variant];
  const accent = VARIANT_ACCENT[variant];
  const a = ACCENT_STYLES[accent];

  return (
    <AuthAccentProvider accent={accent}>
      <motion.div
        {...pageEnter}
        className="relative w-full max-w-[540px] overflow-hidden rounded-[28px] border border-white/60 bg-white/95 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.18)] backdrop-blur-xl"
      >
        {/* Yuqori gradient chiziq — variant rangi */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${c.glowColor}, ${c.glowColor}88, transparent)` }}
        />

        <div className="p-8 pt-7">
          {/* Logo + stat */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className={cn("flex size-10 items-center justify-center rounded-xl text-white shadow-sm", a.logo)}>
                <Scissors className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">MySaloon Partner</p>
                <p className={cn("text-[11px] font-semibold uppercase tracking-wider", a.text)}>{c.badge}</p>
              </div>
            </div>
            <div className="rounded-xl border border-black/[0.06] bg-zinc-50 px-3 py-2 text-right">
              <p className={cn("text-lg font-bold tabular-nums leading-none", a.text)}>{c.stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{c.stat.label}</p>
            </div>
          </div>

          {/* Marketing — qisqa, forma ustida */}
          <div className="mt-6">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
              {c.headline}{" "}
              <span className={c.highlightClass}>{c.highlight}</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.subline}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.bullets.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700"
                >
                  <Check className="size-3" style={{ color: c.glowColor }} strokeWidth={3} />
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Tab + forma — bitta blok */}
          <div className="mt-7 rounded-2xl border border-black/[0.05] bg-zinc-50/80 p-1">
            <AuthDesktopTabSwitcher tab={tab} onTabChange={onTabChange} accent={accent} />
            <div className={cn("rounded-xl bg-white p-5 pt-4", LIGHT_FORM_SKIN)}>
              <AuthDesktopFormChrome
                tab={tab}
                signupStep={signupStep}
                flow={flow}
                accent={accent}
                showMarketingTitle={false}
              >
                {children}
              </AuthDesktopFormChrome>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
            {tab === "login" ? (
              <>
                Tugmani bosish orqali{" "}
                <a href="/privacy" className={cn(a.link, "hover:underline")}>
                  Oferta
                </a>{" "}
                va{" "}
                <a href="/privacy" className={cn(a.link, "hover:underline")}>
                  Maxfiylik
                </a>
                ga rozilik bildirasiz.
              </>
            ) : (
              "Ro'yxatdan o'tish bepul — bir necha daqiqada profilni yoqing."
            )}
          </p>
        </div>
      </motion.div>
    </AuthAccentProvider>
  );
}

export function AuthDesktopLayout({ variant, ...props }: AuthDesktopLayoutProps) {
  const c = FRAMER_VARIANT_CONFIG[variant];

  return (
    <div className={cn("relative min-h-screen overflow-hidden", c.bgLeft)}>
      <motion.div
        className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full opacity-50 blur-3xl"
        style={{ background: c.glowColor }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full opacity-40 blur-3xl"
        style={{ background: c.glowColor }}
        animate={{ scale: [1.1, 1, 1.1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-16 pb-36">
        <UnifiedAuthCard variant={variant} {...props} />
      </div>
    </div>
  );
}
