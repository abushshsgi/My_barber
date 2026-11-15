import { lazy, Suspense, type ReactNode } from "react";

const FirstVisitOnboarding = lazy(() =>
  import("@/components/first-visit/FirstVisitOnboarding").then((m) => ({
    default: m.FirstVisitOnboarding,
  })),
);
const ExternalBrowserPrompt = lazy(() =>
  import("@/components/ExternalBrowserPrompt").then((m) => ({ default: m.ExternalBrowserPrompt })),
);
const FirebaseInit = lazy(() =>
  import("@/components/FirebaseInit").then((m) => ({ default: m.FirebaseInit })),
);
const GoogleAnalytics = lazy(() =>
  import("@/components/GoogleAnalytics").then((m) => ({ default: m.GoogleAnalytics })),
);
const SiteTelemetry = lazy(() =>
  import("@/components/SiteTelemetry").then((m) => ({ default: m.SiteTelemetry })),
);
const DeployRecovery = lazy(() =>
  import("@/components/DeployRecovery").then((m) => ({ default: m.DeployRecovery })),
);

/**
 * Non-critical client widgets — code-split so /ai-style initial JS stays smaller.
 */
function Defer({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export function DeferredClientWidgets() {
  return (
  <>
      <Defer>
        <FirstVisitOnboarding />
      </Defer>
      <Defer>
        <ExternalBrowserPrompt />
      </Defer>
      <Defer>
        <FirebaseInit />
      </Defer>
      <Defer>
        <GoogleAnalytics />
      </Defer>
      <Defer>
        <SiteTelemetry />
      </Defer>
      <Defer>
        <DeployRecovery />
      </Defer>
    </>
  );
}