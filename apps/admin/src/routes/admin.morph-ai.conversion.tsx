import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { fetchMorphAiConversion } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/morph-ai/conversion")({
  component: MorphConversionPage,
});

function MorphConversionPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "conversion", range.start, range.end],
    queryFn: () => fetchMorphAiConversion({ range }),
  });
  const d = q.data;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Konversiya"
        description="Try-on qilgan mijozlardan nechtasi bron qildi — Morph AI ROI."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
      />
      {q.isLoading || !d ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard label="Try-on userlar" value={d.summary.tryon_users.toLocaleString()} />
          <KPICard label="Bron qilganlar" value={d.summary.booked_users.toLocaleString()} />
          <KPICard label="Konversiya" value={`${d.summary.conversion_rate}%`} />
          <KPICard
            label="24 soat ichida"
            value={d.summary.same_day_bookings.toLocaleString()}
            hint="Try-ondan keyin 24h"
          />
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Hisob: davr ichida muvaffaqiyatli try-on qilgan userlar orasida, shu davrdan boshlab bron
        qilganlar ulushi.
      </p>
    </div>
  );
}
