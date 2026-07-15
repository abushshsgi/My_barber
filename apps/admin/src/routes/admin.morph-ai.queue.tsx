import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clearMorphAiQueue, fetchMorphAiQueue } from "@/lib/admin-api";
import { MorphAiSeeAllLink } from "@/components/admin/MorphAiSeeAllLink";

export const Route = createFileRoute("/admin/morph-ai/queue")({
  component: MorphQueuePage,
});

function MorphQueuePage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "queue"],
    queryFn: fetchMorphAiQueue,
    refetchInterval: 5000,
  });
  const clear = useMutation({
    mutationFn: clearMorphAiQueue,
    onSuccess: (r) => {
      toast.success(`${r.cleared} ta job tozalandi`);
      void qc.invalidateQueries({ queryKey: ["admin", "morph-ai", "queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = q.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Try-on navbat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Redis queue chuqurligi, processing joblar, stuck tozalash
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          disabled={!d?.enabled || clear.isPending}
          onClick={() => {
            if (confirm("Navbatdagi barcha joblarni o'chirish?")) clear.mutate();
          }}
        >
          Navbatni tozalash
        </Button>
      </div>

      {q.isLoading || !d ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KPICard label="Holat" value={d.enabled ? "Yoqilgan" : "O'chirilgan"} />
            <KPICard label="Chuqurlik" value={String(d.depth)} hint={`Max ${d.max_depth}`} />
            <KPICard label="Processing" value={String(d.processing_sample.length)} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-semibold">Navbatdagi joblar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Eng oxirgi 10 ta</p>
            {d.queued_sample.length === 0 ? (
              <EmptyState className="mt-4" title="Navbat bo'sh" />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Uslub</TableHead>
                      <TableHead>Holat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.queued_sample.slice(0, 10).map((j) => (
                      <TableRow key={j.job_id}>
                        <TableCell className="font-mono text-xs">{j.job_id.slice(0, 10)}…</TableCell>
                        <TableCell>{j.user_id ?? "—"}</TableCell>
                        <TableCell>{j.style_title || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{j.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <MorphAiSeeAllLink kind="queue" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
