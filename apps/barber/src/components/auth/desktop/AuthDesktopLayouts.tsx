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

/** Chap panel — marketing matn (forma alohida). */
function MarketingPanel({ variant }: { variant: AuthDesktopVariant }) {
  const c = FRAMER_VARIANT_CONFIG[variant];
  const isDark = c.textMain.includes("white");

  return (
    <div className={cn("relative flex flex-col justify-center overflow-hidden px-10 py-14 lg:px-16 lg:py-16", c.bgLeft)}>
      <motion.div
        className={cn(
          "pointer-events-none absolute -right-16 top-1/4 size-80 rounded-full opacity-40 blur-3xl",
          c.orbPosition,
        )}
        style={{ background: c.glowColor }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 h-px w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${c.glowColor}66, transparent)` }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <motion.div {...pageEnter} className="relative z-10 max-w-xl">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl text-white shadow-sm",
              ACCENT_STYLES[c.accent].logo,
            )}
          >
            <Scissors className="size-4" />
          </div>
          <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-foreground")}>MySaloon Partner</span>
        </div>

        <span
          className={cn(
            "mt-8 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
            isDark ? "bg-white/10 text-white/90" : "bg-black/5 text-zinc-600",
          )}
        >
          {c.badge}
        </span>

        <h1
          className={cn(
            "mt-5 text-4xl font-bold leading-[1.08] tracking-tight lg:text-[3.25rem]",
            c.textMain,
          )}
        >
          {c.headline}
          <br />
          <span className={c.highlightClass}>{c.highlight}</span>
        </h1>

        <p className={cn("mt-5 max-w-md text-base leading-relaxed lg:text-[17px]", isDark ? "text-zinc-400" : "text-zinc-600")}>
          {c.subline}
        </p>

        <ul className="mt-9 space-y-3">
          {c.bullets.map((b, i) => (
            <motion.li
              key={b}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + i * 0.08 }}
              className={cn("flex items-center gap-3 text-sm font-medium", isDark ? "text-zinc-300" : "text-zinc-700")}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${c.glowColor}33`, color: c.glowColor }}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              {b}
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className={cn(
            "mt-11 inline-flex items-baseline gap-2.5 rounded-2xl border px-5 py-3.5",
            isDark ? "border-white/10 bg-white/5" : "border-black/5 bg-white/70 shadow-sm",
          )}
        >
          <span className={cn("text-3xl font-bold tabular-nums", c.highlightClass)}>{c.stat.value}</span>
          <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-500")}>{c.stat.label}</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** O'ng panel — faqat forma. */
function FormPanel({
  variant,
  tab,
  signupStep,
  flow,
  onTabChange,
  children,
}: ShellProps & { variant: AuthDesktopVariant }) {
  const accent = VARIANT_ACCENT[variant];
  const a = ACCENT_STYLES[accent];

  return (
    <div className="flex flex-col justify-center bg-white px-8 py-12 lg:px-14 lg:py-16">
      <AuthAccentProvider accent={accent}>
        <motion.div {...pageEnter} className="mx-auto w-full max-w-[440px]">
          <AuthDesktopTabSwitcher tab={tab} onTabChange={onTabChange} accent={accent} />

          <div className={cn("mt-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 shadow-sm", LIGHT_FORM_SKIN)}>
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

          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
            {tab === "login" ? (
              <>
                Tugmani bosish orqali{" "}
                <a href="/privacy" className={cn(a.link, "hover:underline")}>
                  Oferta
                </a>{" "}
                va{" "}
                <a href="/privacy" className={cn(a.link, "hover:underline")}>
                  Maxfiylik siyosati
                </a>
                ga rozilik bildirasiz.
              </>
            ) : (
              "Ro'yxatdan o'tish bepul — bir necha daqiqada profilni yoqing."
            )}
          </p>
        </motion.div>
      </AuthAccentProvider>
    </div>
  );
}

export function AuthDesktopLayout({ variant, ...props }: AuthDesktopLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <MarketingPanel variant={variant} />
      <FormPanel variant={variant} {...props} />
    </div>
  );
}
