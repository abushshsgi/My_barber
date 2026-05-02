import { createFileRoute } from "@tanstack/react-router";
import { IndependentSetupPage } from "@/components/salon/IndependentSetupPage";

export const Route = createFileRoute("/independent/setup")({
  component: IndependentSetup,
});

function IndependentSetup() {
  return <IndependentSetupPage />;
}
