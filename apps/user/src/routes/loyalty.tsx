import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/loyalty")({
  beforeLoad: () => {
    throw redirect({ to: "/wallet", search: { section: "loyalty" } });
  },
});
