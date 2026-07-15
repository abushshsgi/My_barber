import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/salons/$salonId/stats")({
  component: AdminSalonStatsLayout,
});

function AdminSalonStatsLayout() {
  return <Outlet />;
}
