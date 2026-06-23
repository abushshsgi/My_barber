import type { ReactNode } from "react";
import { AuthAccentProvider } from "@/components/auth/AuthAccentContext";
import { AuthDesktopFormChrome } from "@/components/auth/desktop/AuthDesktopFormChrome";
import { AuthDesktopTabSwitcher } from "@/components/auth/desktop/AuthDesktopTabSwitcher";
import { AuthMarketingPanel } from "@/components/auth/desktop/AuthMarketingPanel";
import type { SignupFlow } from "@/lib/auth-ui";
import { ACCENT_STYLES, AUTH_ACCENT, LIGHT_FORM_SKIN } from "@/lib/auth-desktop-variant";
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
      <AuthMarketingPanel tab={tab} flow={flow} />
      <FormPanel tab={tab} flow={flow} {...props} />
    </div>
  );
}
