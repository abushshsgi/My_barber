import type { ReactNode } from "react";
import { AuthOnboardingProgress } from "@/components/auth/uzum/AuthOnboardingProgress";
import { AuthDesktopCardTitle } from "@/components/auth/desktop/AuthDesktopCardTitle";
import type { SignupFlow } from "@/lib/auth-ui";
import type { AuthAccent, AuthDesktopVariant } from "@/lib/auth-desktop-variant";
import { ACCENT_STYLES } from "@/lib/auth-desktop-variant";

type Props = {
  tab: "login" | "signup";
  signupStep: number;
  flow: SignupFlow | null;
  accent?: AuthAccent;
  variant?: AuthDesktopVariant;
  dark?: boolean;
  titleSize?: "title" | "hero" | "compact";
  showProgress?: boolean;
  showLegal?: boolean;
  children: ReactNode;
};

export function AuthDesktopFormChrome({
  tab,
  signupStep,
  flow,
  accent = "violet",
  dark = false,
  titleSize = "title",
  showProgress = true,
  showLegal = true,
  children,
}: Props) {
  const link = ACCENT_STYLES[accent].link;

  return (
    <>
      <AuthDesktopCardTitle
        tab={tab}
        signupStep={signupStep}
        flow={flow}
        size={titleSize}
        dark={dark}
        className="mb-6"
      />
      {tab === "signup" && showProgress ? (
        <AuthOnboardingProgress step={signupStep} accent={accent} />
      ) : null}
      {children}
      {tab === "login" && showLegal ? (
        <p
          className={`mt-6 text-center text-[11px] leading-relaxed ${dark ? "text-zinc-500" : "text-muted-foreground"}`}
        >
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
