import { createFileRoute } from "@tanstack/react-router";
import { IndependentSetupPage } from "@/components/salon/IndependentSetupPage";
import { ensureBarberSignupAccess } from "@/lib/auth-guard";

export const Route = createFileRoute("/independent/setup")({
  beforeLoad: ensureBarberSignupAccess,
  component: IndependentSetup,
});

function IndependentSetup() {
  return <IndependentSetupPage />;
}
