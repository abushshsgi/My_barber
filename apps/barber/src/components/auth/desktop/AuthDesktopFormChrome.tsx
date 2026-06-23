import type { ReactNode } from "react";
import { AuthOnboardingProgress } from "@/components/auth/uzum/AuthOnboardingProgress";
import { AuthDesktopCardTitle } from "@/components/auth/desktop/AuthDesktopCardTitle";
import type { SignupFlow } from "@/lib/auth-ui";
import type { AuthAccent } from "@/lib/auth-desktop-variant";
import { ACCENT_STYLES } from "@/lib/auth-desktop-variant";

type Props = {
  tab: "login" | "signup";
  signupStep: number;
  flow: SignupFlow | null;
  accent?: AuthAccent;
  showMarketingTitle?: boolean;
  children: ReactNode;
};

export function AuthDesktopFormChrome({
  tab,
  signupStep,
  flow,
  accent = "violet",
  showMarketingTitle = true,
  children,
}: Props) {
  const link = ACCENT_STYLES[accent].link;

  return (
    <>
      {showMarketingTitle ? (
        <AuthDesktopCardTitle
          tab={tab}
          signupStep={signupStep}
          flow={flow}
          size="compact"
          className="mb-4"
        />
      ) : tab === "signup" ? (
        <AuthDesktopCardTitle
          tab={tab}
          signupStep={signupStep}
          flow={flow}
          size="compact"
          className="mb-3"
        />
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">Email va parolingiz bilan davom eting.</p>
      )}

      {tab === "signup" ? <AuthOnboardingProgress step={signupStep} accent={accent} /> : null}

      {children}
    </>
  );
}
