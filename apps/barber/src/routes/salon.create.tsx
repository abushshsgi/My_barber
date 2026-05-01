import { createFileRoute } from "@tanstack/react-router";
import { CreateSalonPage } from "../../../../_upstream_salon_creator_suite/src/components/salon/CreateSalonPage";

export const Route = createFileRoute("/salon/create")({
  component: SalonCreatePage,
});

function SalonCreatePage() {
  return <CreateSalonPage />;
}

