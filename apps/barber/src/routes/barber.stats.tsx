import { createFileRoute, Outlet } from "@tanstack/react-router";
import { prefetchBarberAnalytics } from "@/hooks/use-barber-queries";
import { statsRangeToIsoParams } from "@/lib/finance-range";
import { readOnboardingStatusCache } from "@/lib/onboarding-status-cache";

export const Route = createFileRoute("/barber/stats")({
  loader: ({ context: { queryClient } }) => {
    const cached = readOnboardingStatusCache();
    if (cached?.fully_ready !== true) return;
    const dates = statsRangeToIsoParams("30d");
    void prefetchBarberAnalytics(queryClient, dates);
  },
  component: StatsLayout,
});

function StatsLayout() {
  return <Outlet />;
}
