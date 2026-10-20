import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadMorphFreeTrialUsersCsv,
  fetchMorphFreeTrialUsers,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/morph-ai/free-trial")({
  component: MorphFreeTrialPage,
});

const PAGE_SIZE = 50;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function MorphFreeTrialPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const query = useQuery({
    queryKey: ["admin", "morph-ai", "free-trial", q, page],
    queryFn: () => fetchMorphFreeTrialUsers({ q, page, page_size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const d = query.data;
  const totalPages = d ? Math.max(1, Math.ceil(d.count / PAGE_SIZE)) : 1;

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await downloadMorphFreeTrialUsersCsv(q);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "morph-free-tryon-users.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CSV yuklab bo'lmadi");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Bepul try-on userlari</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ilovani yuklab, bir martalik bepul try-on generatsiyasini ishlatgan yangi userlar
          </p>
        </div>
        <Button type="button" variant="outline" disabled={exporting} onClick={() => void onExport()}>
          {exporting ? "Yuklanmoqda…" : "CSV yuklab olish"}
        </Button>
      </div>

      {query.isError ? (
        <EmptyState
          title="Ma'lumotni yuklab bo'lmadi"
          description={query.error instanceof Error ? query.error.message : undefined}
        />
      ) : !d ? (
        <CardSkeleton className="h-28" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Bepulni ishlatgan" value={d.summary.used_total} />
          <Stat
            label="Hali ishlatmagan"
            value={d.summary.unused_total}
            hint={`Jami huquqi bor: ${d.summary.eligible_total}`}
          />
          <Stat label="Obunaga o'tgan" value={d.summary.converted_total} />
          <Stat label="Konversiya" value={`${d.summary.conversion_pct}%`} />
        </div>
      )}

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Ism, telefon, email yoki ID bo'yicha qidirish"
        className="max-w-md"
      />

      {query.isLoading ? (
        <CardSkeleton className="h-64" />
      ) : d && d.results.length === 0 ? (
        <EmptyState title="Hali hech kim bepul try-on ishlatmagan" />
      ) : d ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Ro'yxatdan o'tgan</TableHead>
                <TableHead>Bepul ishlatgan</TableHead>
                <TableHead className="text-right">Jami try-on</TableHead>
                <TableHead>Qurilma</TableHead>
                <TableHead>Oxirgi faollik</TableHead>
                <TableHead>Obuna</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.results.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: String(u.user_id) }}
                      className="font-medium hover:underline"
                    >
                      {u.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {[u.phone, u.email].filter(Boolean).join(" · ") || `#${u.user_id}`}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fmtDate(u.date_joined)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {fmtDate(u.free_tryon_used_at)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{u.tryon_total}</TableCell>
                  <TableCell className="text-sm">
                    <div>{u.platform || u.client_kind || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {[u.device_name, u.app_version && `v${u.app_version}`].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fmtDate(u.last_seen_at)}</TableCell>
                  <TableCell>
                    {u.subscription_plan ? (
                      <Badge variant={u.subscription_status === "active" ? "default" : "outline"}>
                        {u.subscription_plan}
                        {u.subscription_status && u.subscription_status !== "active"
                          ? ` · ${u.subscription_status}`
                          : ""}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Yo'q</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Jami: {d.count} · Sahifa {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Oldingi
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || query.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Keyingi
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
