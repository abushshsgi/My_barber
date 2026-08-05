import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { getAuthUser } from "@/lib/auth";
import { hasValidUserSession } from "@/lib/api/client";
import { useOnboardingRequired } from "@/hooks/use-me";

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const { required, isLoading, isPending } = useOnboardingRequired();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const hasCachedUser = Boolean(getAuthUser());
  const hasSession = hasValidUserSession();
  const loggedIn = hasSession || hasCachedUser;

  useEffect(() => {
    // Mehmon: onboarding majburiy emas.
    if (!loggedIn) return;
    // /me hali kelmagan — home/onboarding qarorini bermaymiz.
    if (isPending || isLoading) return;
    if (required && !onOnboarding) {
      void navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (!required && onOnboarding) {
      void navigate({ to: "/", replace: true });
    }
  }, [required, isLoading, isPending, onOnboarding, navigate, loggedIn]);

  if (!loggedIn) {
    return children;
  }

  // Login bo'lgan: /me aniqlangunicha home flash bo'lmasin.
  if (isPending || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      </div>
    );
  }

  if (required && !onOnboarding) {
    return null;
  }

  return children;
}
