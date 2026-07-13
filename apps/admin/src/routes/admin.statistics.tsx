import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StatisticsSubNav } from "@/components/admin/StatisticsShell";

export const Route = createFileRoute("/admin/statistics")({
  component: StatisticsLayout,
});

function StatisticsLayout() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <StatisticsSubNav />
      <Outlet />
    </div>
  );
}
