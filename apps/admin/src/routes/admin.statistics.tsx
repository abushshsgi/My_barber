import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { StatisticsSubNav } from "@/components/admin/StatisticsShell";

export const Route = createFileRoute("/admin/statistics")({
  component: StatisticsLayout,
});

function StatisticsLayout() {
  const { pathname } = useLocation();
  // Hamyon → Aylanma; agent statistikasi → Agentlar — yuqori tablar chalkashmasin.
  const hideSubNav =
    pathname.startsWith("/admin/statistics/wallet") ||
    pathname.startsWith("/admin/statistics/revenue") ||
    pathname.startsWith("/admin/statistics/agents");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {hideSubNav ? null : <StatisticsSubNav />}
      <Outlet />
    </div>
  );
}
