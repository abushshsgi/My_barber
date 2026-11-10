import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsLayout,
});

function AnalyticsLayout() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <Outlet />
    </div>
  );
}
