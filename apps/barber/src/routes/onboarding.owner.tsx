import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/owner")({
  component: OwnerOnboardingPage,
});

function OwnerOnboardingPage() {
  return <Navigate to="/salon/create" />;
}

