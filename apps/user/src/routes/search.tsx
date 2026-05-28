import { createFileRoute } from "@tanstack/react-router";
import SearchPage from "@/page-views/Search";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});
