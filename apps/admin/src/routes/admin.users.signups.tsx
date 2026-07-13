import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users/signups")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/statistics/users" });
  },
});
