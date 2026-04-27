import { createFileRoute } from "@tanstack/react-router";
import SalonPage from "@/page-views/SalonPage";

export const Route = createFileRoute("/salon/$id")({
  component: SalonPage,
});

