import type { ReactNode } from "react";
import { AuthAccentProvider } from "@/components/auth/AuthAccentContext";
import { AuthDesktopFormChrome } from "@/components/auth/desktop/AuthDesktopFormChrome";
import { AuthDesktopTabSwitcher } from "@/components/auth/desktop/AuthDesktopTabSwitcher";
import { AuthMarketingPanel } from "@/components/auth/desktop/AuthMarketingPanel";
import type { SignupFlow } from "@/lib/auth-ui";
import { ACCENT_STYLES, AUTH_ACCENT, LIGHT_FORM_SKIN } from "@/lib/auth-desktop-variant";
import { resolveAuthPanelTone } from "@/lib/barber-flow-config";
import { pageEnter } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type AuthDesktopLayoutProps = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep: number;
  onTabChange: (tab: "login" | "signup") => void;
  children: ReactNode;
};

const accent = AUTH_ACCENT;
const a = ACCENT_STYLES[accent];

function FormPanel({ tab, signupStep, flow, onTabChange, children }: AuthDesktopLayoutProps) {
  const isSignup = tab === "signup";

  return (
    <div className="relative flex h-full min-h-0 flex-col justify-center overflow-hidden px-5 py-8 sm:px-7 sm:py-10 lg:px-14 lg:py-12">
      <AuthAccentProvider accent={accent}>
        <motion.div
          {...pageEnter}
          className={cn("relative z-10 mx-auto w-full", isSignup ? "max-w-[34rem]" : "max-w-[27.5rem]")}
        >
          <AuthDesktopTabSwitcher tab={tab} onTabChange={onTabChange} accent={accent} />

          <div
            className={cn(
              "mt-3 overflow-hidden rounded-2xl border border-border/40 bg-white shadow-sm",
              isSignup ? "p-4 sm:p-5 lg:p-7" : "p-4 sm:p-5",
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
  const tone = resolveAuthPanelTone(tab, flow);

  return (
    <div className={cn("relative grid h-[100dvh] max-h-[100dvh] w-full overflow-hidden lg:grid-cols-2", tone.bg)}>
      <motion.div
        key={tone.glow}
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(100vw,56rem)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: tone.glow }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.22, 0.32, 0.22] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <AuthMarketingPanel tab={tab} flow={flow} />
      <FormPanel tab={tab} flow={flow} {...props} />
    </div>
  );
}
