import type { ReactNode } from "react";
import { AuthOnboardingProgress } from "@/components/auth/uzum/AuthOnboardingProgress";
import { AuthUzumCardTitle } from "@/components/auth/uzum/AuthUzumCardTitle";
import type { SignupFlow } from "@/lib/auth-ui";
import type { AuthAccent } from "@/lib/auth-desktop-variant";
import { ACCENT_STYLES } from "@/lib/auth-desktop-variant";

type Props = {
  tab: "login" | "signup";
  signupStep: number;
  flow: SignupFlow | null;
  accent?: AuthAccent;
  children: ReactNode;
};

export function AuthDesktopFormChrome({ tab, signupStep, flow, accent = "violet", children }: Props) {
  const link = ACCENT_STYLES[accent].link;
  return (
    <>
      <AuthUzumCardTitle tab={tab} signupStep={signupStep} flow={flow} />
      {tab === "signup" ? <AuthOnboardingProgress step={signupStep} accent={accent} /> : null}
      {children}
      {tab === "login" ? (
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Tugmani bosish orqali{" "}
          <a href="/privacy" className={`${link} hover:underline`}>
            Oferta
          </a>{" "}
          va{" "}
          <a href="/privacy" className={`${link} hover:underline`}>
            Maxfiylik siyosati
          </a>
          ga rozilik bildirasiz.
        </p>
      ) : null}
    </>
  );
}
