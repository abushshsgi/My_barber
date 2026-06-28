import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/barbers/$barberId/stats")({
  component: AdminBarberStatsLayout,
});

function AdminBarberStatsLayout() {
  return <Outlet />;
}
