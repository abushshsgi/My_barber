import { createFileRoute } from "@tanstack/react-router";
import { CreateSalonPage } from "@/components/salon/CreateSalonPage";
import { ensureBarberSignupAccess } from "@/lib/auth-guard";

export const Route = createFileRoute("/salon/create")({
  beforeLoad: ensureBarberSignupAccess,
  component: SalonCreatePage,
});

function SalonCreatePage() {
  return <CreateSalonPage />;
}
