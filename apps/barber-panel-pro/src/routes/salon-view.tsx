import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/salon-view")({
  component: SalonViewLayout,
});

function SalonViewLayout() {
  return <Outlet />;
}
