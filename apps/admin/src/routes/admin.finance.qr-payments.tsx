import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QrCode, RefreshCw } from "lucide-react";
import { useState } from "react";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { apiJson } from "@/lib/api";

export const Route = createFileRoute("/admin/finance/qr-payments")({
  component: AdminQrPaymentsPage,
});

type Row = {
  id: string;
  amount: string;
  note: string;
  status: string;
  barber_id: number;
  barber_name: string;
  payer_id: number;
  payer_name: string;
  created_at: string;
};

type ListResponse = {
  total_volume: string;
  total_count: number;
  results: Row[];
};

function AdminQrPaymentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const listQ = useQuery({
    queryKey: ["admin", "qr-payments", q, status],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (status) sp.set("status", status);
      sp.set("page_size", "100");
      return apiJson<ListResponse>(`/api/v1/admin/finance/qr-payments/?${sp}`);
    },
  });

  const rows = listQ.data?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">QR to'lovlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mijozlar sartaroshlarga QR orqali qilgan to'lovlar — platforma nazorati.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void listQ.refetch()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
        >
          <RefreshCw className="size-3.5" /> Yangilash
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground">Jami hajm</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {formatAdminUzs(Number(listQ.data?.total_volume ?? 0))}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground">To'lovlar soni</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{listQ.data?.total_count ?? 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Qidiruv: sartarosh, mijoz, ID…"
          className="min-w-[220px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Barcha status</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Vaqt</th>
              <th className="px-3 py-2.5 font-semibold">Mijoz</th>
              <th className="px-3 py-2.5 font-semibold">Sartarosh</th>
              <th className="px-3 py-2.5 font-semibold">Summa</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Yuklanmoqda…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  <QrCode className="mx-auto mb-2 size-8 opacity-40" />
                  QR to'lovlar yo'q
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border/70">
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("uz-UZ")}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold">{r.payer_name}</p>
                    <p className="text-[10px] text-muted-foreground">#{r.payer_id}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold">{r.barber_name}</p>
                    <p className="text-[10px] text-muted-foreground">#{r.barber_id}</p>
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums">
                    {formatAdminUzs(Number(r.amount))}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{r.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Ledger qidiruv:{" "}
        <Link to="/admin/ledger" className="font-semibold underline underline-offset-2">
          /admin/ledger
        </Link>
      </p>
    </div>
  );
}
