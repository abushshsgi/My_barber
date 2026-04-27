import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/page-views/Profile";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

