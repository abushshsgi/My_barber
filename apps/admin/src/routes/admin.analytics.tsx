import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AnalyticsChrome } from "@/components/admin/analytics-shell";
import { AnalyticsPeriodProvider } from "@/components/admin/RevenueAnalytics";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsLayout,
});

function AnalyticsLayout() {
  return (
    <AnalyticsPeriodProvider>
      <AnalyticsChrome>
        <Outlet />
      </AnalyticsChrome>
    </AnalyticsPeriodProvider>
  );
}
