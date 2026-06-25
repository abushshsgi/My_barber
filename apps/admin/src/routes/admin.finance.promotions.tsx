import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Rocket } from "lucide-react";
import { toast } from "sonner";
import {
  approvePromotion,
  fetchPromotions,
  rejectPromotion,
  type AdminPromotion,
} from "@/lib/admin-api";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/admin/finance/promotions")({
  component: PromotionsPage,
});

const FILTERS = [
  { id: "pending", label: "Kutilmoqda" },
  { id: "active", label: "Faol" },
  { id: "cancelled", label: "Rad etilgan" },
  { id: "", label: "Hammasi" },
] as const;

function PromotionsPage() {
  const [status, setStatus] = useState<string>("pending");
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "promotions", status],
    queryFn: () => fetchPromotions(status || undefined),
  });
  const approveMut = useMutation({
    mutationFn: approvePromotion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promotions"] });
      toast.success("TOP reklama tasdiqlandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rejectMut = useMutation({
    mutationFn: rejectPromotion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promotions"] });
      toast.success("So'rov rad etildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const data = q.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Rocket className="size-7" />
            TOP reklamalar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sartaroshlarning to'lov asosidagi yuqori ko'rinish so'rovlari.
          </p>
        </div>
        <div className="inline-flex gap-1 bg-muted p-1 rounded-lg">
          {FILTERS.map((f) => (
            <button
              key={f.id || "all"}
              type="button"
              onClick={() => setStatus(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                status === f.id
                  ? "bg-background text-foreground shadow-card font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {q.isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">So'rovlar yo'q.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Sartarosh</th>
                <th className="px-6 py-3 font-medium">Paket</th>
                <th className="px-6 py-3 font-medium text-right">Summa</th>
                <th className="px-6 py-3 font-medium">Muddat</th>
                <th className="px-6 py-3 font-medium">Holat</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((p) => (
                <PromotionRow
                  key={p.id}
                  row={p}
                  onApprove={() => approveMut.mutate(p.id)}
                  onReject={() => rejectMut.mutate(p.id)}
                  busy={approveMut.isPending || rejectMut.isPending}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PromotionRow({
  row: p,
  onApprove,
  onReject,
  busy,
}: {
  row: AdminPromotion;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const statusMap: Record<string, "pending" | "completed" | "cancelled"> = {
    pending: "pending",
    active: "completed",
    cancelled: "cancelled",
    expired: "cancelled",
  };
  return (
    <tr className="hover:bg-background/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {p.barber_avatar ? (
            <img src={p.barber_avatar} className="size-8 rounded-full object-cover" alt="" />
          ) : (
            <div className="size-8 rounded-full bg-muted" />
          )}
          <div>
            <div className="font-medium text-foreground">{p.barber_name || p.barber_email}</div>
            <div className="text-xs text-muted-foreground">{p.region || "—"}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">{p.package_label}</td>
      <td className="px-6 py-4 text-right tabular-nums font-medium">
        {p.amount_paid.toLocaleString()} so'm
      </td>
      <td className="px-6 py-4 text-xs text-muted-foreground">
        {p.starts_at ? format(new Date(p.starts_at), "dd.MM.yyyy") : "—"} –{" "}
        {p.ends_at ? format(new Date(p.ends_at), "dd.MM.yyyy") : "—"}
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={statusMap[p.status] ?? "pending"} label={p.status} />
      </td>
      <td className="px-6 py-4 text-right space-x-2">
        {p.status === "pending" && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>
              Rad etish
            </Button>
            <Button size="sm" disabled={busy} onClick={onApprove}>
              Tasdiqlash
            </Button>
          </>
        )}
      </td>
    </tr>
  );
}
