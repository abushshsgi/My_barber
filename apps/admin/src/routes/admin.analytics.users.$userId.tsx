import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AnalyticsError, AnalyticsSkeleton, errorText } from "@/components/admin/analytics-shell";
import { JourneyTimeline } from "@/components/admin/analytics-blocks";
import { fetchAnalyticsJourney } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/users/$userId")({
  component: JourneyPage,
});

function JourneyPage() {
  const { userId } = Route.useParams();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["analytics", "journey", userId, page],
    queryFn: () => fetchAnalyticsJourney(userId, page),
  });
  if (query.isPending) return <AnalyticsSkeleton rows={2} />;
  if (query.isError)
    return <AnalyticsError message={errorText(query.error)} onRetry={() => void query.refetch()} />;
  if (!query.data) return null;
  return (
    <div className="space-y-4">
      <Link
        to="/admin/analytics/users"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Ro'yxatga qaytish
      </Link>
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <JourneyTimeline data={query.data} page={page} onPage={setPage} />
      </section>
    </div>
  );
}
