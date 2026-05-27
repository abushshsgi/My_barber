import { createFileRoute } from "@tanstack/react-router";
import Favorites from "@/page-views/Favorites";

export const Route = createFileRoute("/favorites")({
  component: Favorites,
});
