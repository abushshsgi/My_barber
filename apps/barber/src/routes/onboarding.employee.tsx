import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Ishchi yo‘li — mavjud salonga ulanish salon join sahifasida bajariladi. */
export const Route = createFileRoute("/onboarding/employee")({
  component: EmployeeOnboardingPage,
});

function EmployeeOnboardingPage() {
  return <Navigate to="/salon/join" replace />;
}
