import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMorphAiBudget, patchMorphAiSettings } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/morph-ai/budget")({
  component: MorphBudgetPage,
});

function MorphBudgetPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "budget", range.start, range.end],
    queryFn: () => fetchMorphAiBudget({ range }),
  });
  const [cap, setCap] = useState("50");
  const [enforce, setEnforce] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setCap(q.data.settings.daily_budget_usd);
    setEnforce(q.data.settings.budget_enforce);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      patchMorphAiSettings({
        daily_budget_usd: cap,
        budget_enforce: enforce,
      }),
    onSuccess: () => {
      toast.success("Byudjet saqlandi");
      void qc.invalidateQueries({ queryKey: ["admin", "morph-ai", "budget"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = q.data;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Byudjet"
        description="Kunlik USD soft-cap — yetganda generatsiyani to'xtatish mumkin."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
      />
      {q.isLoading || !d ? (
        <CardSkeleton className="h-40" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Bugun sarflangan" value={`$${d.today.spent_usd}`} />
            <KPICard label="Davr sarfi" value={`$${d.period.spent_usd}`} />
            <KPICard
              label="Qoldiq"
              value={d.period.remaining_usd != null ? `$${d.period.remaining_usd}` : "∞"}
            />
            <KPICard
              label="Foiz"
              value={`${d.period.percent_used}%`}
              hint={d.period.blocked ? "Bloklangan" : "Ochiq"}
            />
          </div>
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Kunlik byudjet (USD, 0 = cheklov yo'q)</span>
              <Input value={cap} onChange={(e) => setCap(e.target.value)} type="number" min={0} step="0.01" />
            </label>
            <label className="flex items-center justify-between text-sm">
              Soft-cap enforce (bloklash)
              <Switch checked={enforce} onCheckedChange={setEnforce} />
            </label>
            <div className="sm:col-span-2">
              <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
                Saqlash
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-semibold">Kunlik xarajat</h2>
            {d.daily.length === 0 ? (
              <EmptyState className="mt-4" title="Ma'lumot yo'q" />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sana</TableHead>
                      <TableHead className="text-right">Generatsiya</TableHead>
                      <TableHead className="text-right">USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.daily.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.generations}</TableCell>
                        <TableCell className="text-right tabular-nums">${row.cost_usd}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
