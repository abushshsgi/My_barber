import { createFileRoute } from "@tanstack/react-router";
import Index from "@/page-views/Index";

export const Route = createFileRoute("/")({
  component: Index,
});

