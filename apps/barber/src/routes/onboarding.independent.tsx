import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Eski havolalar mustaqil setup sahifasiga yo'naltiriladi. */
export const Route = createFileRoute("/onboarding/independent")({
  component: IndependentOnboardingRedirect,
});

function IndependentOnboardingRedirect() {
  return <Navigate to="/independent/setup" replace />;
}
