import { createFileRoute } from "@tanstack/react-router";
import Privacy from "@/page-views/Privacy";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
});
