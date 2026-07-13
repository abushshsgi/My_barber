import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMorphAiPopularity } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/morph-ai/popularity")({
  component: MorphPopularityPage,
});

function MorphPopularityPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "popularity", range.start, range.end],
    queryFn: () => fetchMorphAiPopularity({ range, limit: 50 }),
  });
  const d = q.data;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Uslub popularity"
        description="Qaysi soch uslubi eng ko'p try-on qilingan — katalog tartibi uchun."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
      />
      {q.isLoading || !d ? (
        <CardSkeleton className="h-64" />
      ) : d.styles.length === 0 ? (
        <EmptyState title="Ma'lumot yo'q" description="Try-on bo'lganda uslublar chiqadi." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Uslub</TableHead>
                <TableHead className="text-right">Try-on</TableHead>
                <TableHead className="text-right">OK</TableHead>
                <TableHead className="text-right">User</TableHead>
                <TableHead className="text-right">USD</TableHead>
                <TableHead>Katalog</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.styles.map((s, i) => (
                <TableRow key={s.style_id}>
                  <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{s.style_title}</div>
                    <div className="text-xs text-muted-foreground">{s.style_id}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.generations}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.success}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.users}</TableCell>
                  <TableCell className="text-right tabular-nums">${s.cost_usd}</TableCell>
                  <TableCell>
                    {s.is_published == null ? (
                      "—"
                    ) : (
                      <Badge variant={s.is_published ? "default" : "outline"}>
                        {s.is_published ? "Live" : "Draft"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
