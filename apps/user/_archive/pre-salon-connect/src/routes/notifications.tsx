import { createFileRoute } from "@tanstack/react-router";
import Notifications from "@/page-views/Notifications";

export const Route = createFileRoute("/notifications")({
  component: Notifications,
});

