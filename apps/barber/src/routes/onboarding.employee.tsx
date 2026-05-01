import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Eski havolalar: ishchi endi to'g'ridan-to'g'ri salon join sahifasidan boshlanadi. */
export const Route = createFileRoute("/onboarding/employee")({
  component: EmployeeOnboardingRedirect,
});

function EmployeeOnboardingRedirect() {
  return <Navigate to="/salon/join" replace />;
}
