import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/aylanma")({
  component: AylanmaLayout,
});

function AylanmaLayout() {
  return <Outlet />;
}
