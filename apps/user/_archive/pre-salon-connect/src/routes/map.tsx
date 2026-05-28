import { createFileRoute } from "@tanstack/react-router";
import MapView from "@/page-views/MapView";

export const Route = createFileRoute("/map")({
  component: MapView,
});

