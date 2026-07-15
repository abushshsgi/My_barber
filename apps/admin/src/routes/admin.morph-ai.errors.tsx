import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMorphAiErrors } from "@/lib/admin-api";
import { MorphAiSeeAllLink } from "@/components/admin/MorphAiSeeAllLink";

export const Route = createFileRoute("/admin/morph-ai/errors")({
  component: MorphErrorsPage,
});

function MorphErrorsPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "errors", range.start, range.end],
    queryFn: () => fetchMorphAiErrors({ range, limit: 10 }),
  });
  const d = q.data;
  const recent = d?.recent.slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Xato monitoring"
        description="Failed try-on / tahlil — eng ko'p chiqadigan xatolar va alert."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
      />
      {q.isLoading || !d ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {d.summary.alert ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Success rate past</AlertTitle>
              <AlertDescription>
                {d.summary.success_rate}% — chegaradan past ({d.summary.alert_threshold}%).
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <KPICard label="Jami so'rov" value={d.summary.total.toLocaleString()} />
            <KPICard label="Xatolar" value={d.summary.failed.toLocaleString()} />
            <KPICard label="Success rate" value={`${d.summary.success_rate}%`} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-heading text-lg font-semibold">Top xatolar</h2>
              {d.top_errors.length === 0 ? (
                <EmptyState className="mt-4" title="Xato yo'q" />
              ) : (
                <ul className="mt-4 space-y-3">
                  {d.top_errors.map((e) => (
                    <li key={e.detail} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm">{e.detail}</p>
                        <Badge variant="destructive">{e.count}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-heading text-lg font-semibold">Tur bo'yicha</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {d.by_kind.map((k) => (
                  <Badge key={k.kind} variant="secondary">
                    {k.kind}: {k.count}
                  </Badge>
                ))}
                {d.by_kind.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ma'lumot yo'q</p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-semibold">So'nggi xatolar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Eng oxirgi 10 ta</p>
            {recent.length === 0 ? (
              <EmptyState className="mt-4" title="Hali xato yo'q" />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vaqt</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Tur</TableHead>
                      <TableHead>Xato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {format(parseISO(r.created_at), "dd.MM HH:mm")}
                        </TableCell>
                        <TableCell>{r.user_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.kind}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[360px] truncate text-sm">
                          {r.error_detail || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <MorphAiSeeAllLink kind="errors" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
