import { AnimatePresence, motion } from "framer-motion";
import { Check, Scissors } from "lucide-react";
import type { ReactNode } from "react";
import { AuthAccentProvider } from "@/components/auth/AuthAccentContext";
import { AuthDesktopFormChrome } from "@/components/auth/desktop/AuthDesktopFormChrome";
import { AuthDesktopTabSwitcher } from "@/components/auth/desktop/AuthDesktopTabSwitcher";
import type { SignupFlow } from "@/lib/auth-ui";
import { AUTH_FRAMER_CONFIG } from "@/lib/auth-framer-variants";
import { ACCENT_STYLES, AUTH_ACCENT, LIGHT_FORM_SKIN } from "@/lib/auth-desktop-variant";
import { AUTH_FLOW_MARKETING } from "@/lib/barber-flow-config";
import { pageEnter } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";

export type AuthDesktopLayoutProps = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep: number;
  onTabChange: (tab: "login" | "signup") => void;
  children: ReactNode;
};

const c = AUTH_FRAMER_CONFIG;
const accent = AUTH_ACCENT;
const a = ACCENT_STYLES[accent];

type MarketingContent = {
  key: string;
  badge: string;
  headline: string;
  highlight: string;
  subline: string;
  bullets: readonly string[];
  stat: { value: string; label: string };
};

function resolveMarketing(tab: "login" | "signup", flow: SignupFlow | null): MarketingContent {
  if (tab === "signup" && flow) {
    const m = AUTH_FLOW_MARKETING[flow];
    return { key: flow, ...m };
  }
  return {
    key: "default",
    badge: c.badge,
    headline: c.headline,
    highlight: c.highlight,
    subline: c.subline,
    bullets: c.bullets,
    stat: c.stat,
  };
}

function MarketingPanel({ tab, flow }: { tab: "login" | "signup"; flow: SignupFlow | null }) {
  const content = resolveMarketing(tab, flow);

  return (
    <div className={cn("relative flex flex-col justify-center overflow-hidden px-10 py-14 lg:px-16 lg:py-16", c.bgLeft)}>
      <motion.div
        className="pointer-events-none absolute -right-16 top-1/4 size-80 rounded-full opacity-40 blur-3xl"
        style={{ background: c.glowColor }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 max-w-xl">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex size-10 items-center justify-center rounded-xl text-primary-foreground shadow-sm", a.logo)}>
            <Scissors className="size-4" />
          </div>
          <span className="text-sm font-bold text-foreground">MySaloon Partner</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={content.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="mt-8 inline-flex rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
              {content.badge}
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-zinc-900 lg:text-[3.25rem]">
              {content.headline}
              <br />
              <span className={c.highlightClass}>{content.highlight}</span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-600 lg:text-[17px]">{content.subline}</p>

            <ul className="mt-9 space-y-3">
              {content.bullets.map((b, i) => (
                <motion.li
                  key={b}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.07 }}
                  className="flex items-center gap-3 text-sm font-medium text-zinc-700"
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mt-11 inline-flex items-baseline gap-2.5 rounded-2xl border border-black/5 bg-white/70 px-5 py-3.5 shadow-sm"
            >
              <span className={cn("text-3xl font-bold tabular-nums", c.highlightClass)}>{content.stat.value}</span>
              <span className="text-sm text-zinc-500">{content.stat.label}</span>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function FormPanel({ tab, signupStep, flow, onTabChange, children }: AuthDesktopLayoutProps) {
  const isSignup = tab === "signup";

  return (
    <div className="flex flex-col justify-center bg-white px-8 py-12 lg:px-14 lg:py-16">
      <AuthAccentProvider accent={accent}>
        <motion.div
          {...pageEnter}
          className={cn("mx-auto w-full", isSignup ? "max-w-[34rem]" : "max-w-[27.5rem]")}
        >
          <AuthDesktopTabSwitcher tab={tab} onTabChange={onTabChange} accent={accent} />

          <div
            className={cn(
              "mt-4 rounded-2xl border border-border bg-card shadow-card",
              isSignup ? "p-6 lg:p-7" : "p-5",
              LIGHT_FORM_SKIN,
            )}
          >
            <AuthDesktopFormChrome tab={tab} signupStep={signupStep} flow={flow} accent={accent} showMarketingTitle={false}>
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

export function AuthDesktopLayout({ tab, flow, ...props }: AuthDesktopLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <MarketingPanel tab={tab} flow={flow} />
      <FormPanel tab={tab} flow={flow} {...props} />
    </div>
  );
}
