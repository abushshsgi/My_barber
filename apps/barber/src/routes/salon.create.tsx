import { createFileRoute } from "@tanstack/react-router";
import { CreateSalonPage } from "@/components/salon/CreateSalonPage";

export const Route = createFileRoute("/salon/create")({
  component: SalonCreatePage,
});

function SalonCreatePage() {
  return <CreateSalonPage />;
}

