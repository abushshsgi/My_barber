import { createFileRoute } from "@tanstack/react-router";
import Support from "@/page-views/Support";

export const Route = createFileRoute("/support")({
  component: Support,
});
