import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/favorite-stylists")({
  beforeLoad: () => {
    throw redirect({ to: "/favorites", search: { tab: "stylists" } });
  },
});
