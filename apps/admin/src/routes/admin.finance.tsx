import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/finance")({
  component: FinanceLayout,
});

function FinanceLayout() {
  return <Outlet />;
}
