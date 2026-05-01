import { createFileRoute, redirect } from "@tanstack/react-router";
import { CreateSalonPage } from "@/components/salon/CreateSalonPage";
import { getBarberAccessToken } from "@/lib/api";

export const Route = createFileRoute("/salon/create")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getBarberAccessToken()) {
      throw redirect({ to: "/auth" });
    }
  },
  component: SalonCreatePage,
});

function SalonCreatePage() {
  return <CreateSalonPage />;
}

