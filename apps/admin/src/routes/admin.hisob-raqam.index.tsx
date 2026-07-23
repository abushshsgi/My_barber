import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Hash, Lock, RefreshCw, Search, Wallet } from "lucide-react";
import { formatAdminUzs, formatAdminUzsFull } from "@/lib/admin-analytics";
import { apiJson } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/hisob-raqam/")({
  component: AdminHisobRaqamPage,
});

type AccountRow = {
  barber_id: number;
  barber_name: string;
  barber_phone: string;
  barber_email: string;
  account_number: string;
  account_masked: string;
  account_hash: string;
  balance: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
};

type ListResponse = {
  summary: {
    total_balance: string;
    accounts_count: number;
    locked_count: number;
    pending_payout_total: string;
    pending_payout_count: number;
    qr_volume: string;
    qr_count: number;
  };
  results: AccountRow[];
};

type DetailResponse = {
  account: {
    account_number: string;
    account_masked: string;
    account_hash: string;
    balance: string;
    is_locked: boolean;
  };
  barber: {
    id: number;
    full_name: string;
    phone: string;
    email: string;
    work_mode: string;
    is_active: boolean;
  };
  ledger: Array<{
    id: string;
    entry_type: string;
    amount: string;
    balance_after: string;
    reference_type: string;
    reference_id: string;
    entry_hash: string;
    created_at: string;
  }>;
  payouts: Array<{
    id: number;
    amount: string;
    status: string;
    reference: string;
    created_at: string;
    paid_at: string | null;
  }>;
  qr_payments: Array<{
    id: string;
    amount: string;
    payer_name: string;
    status: string;
    created_at: string;
  }>;
};

function AdminHisobRaqamPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const listQ = useQuery({
    queryKey: ["admin", "accounts", search],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (search.trim()) sp.set("q", search.trim());
      sp.set("page_size", "100");
      return apiJson<ListResponse>(`/api/v1/admin/accounts/?${sp}`);
    },
    refetchInterval: 20_000,
  });

  const detailQ = useQuery({
    queryKey: ["admin", "accounts", selectedId],
    queryFn: () => apiJson<DetailResponse>(`/api/v1/admin/accounts/${selectedId}/`),
    enabled: selectedId != null,
  });

  const rows = listQ.data?.results ?? [];
  const summary = listQ.data?.summary;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Hisob raqam</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Har bir sartaroshning MySaloon hisobi, balansi, QR/bron kirimlari va yechish so&apos;rovlari.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/payouts"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <Banknote className="size-3.5" /> Payouts
          </Link>
          <button
            type="button"
            onClick={() => void listQ.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <RefreshCw className="size-3.5" /> Yangilash
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground">Jami balans</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {formatAdminUzsFull(Number(summary?.total_balance ?? 0))}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground">Hisoblar</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{summary?.accounts_count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground">Kutilayotgan payout</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {formatAdminUzs(Number(summary?.pending_payout_total ?? 0))}
          </p>
          <p className="text-[11px] text-muted-foreground">{summary?.pending_payout_count ?? 0} ta</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground">QR hajm</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {formatAdminUzs(Number(summary?.qr_volume ?? 0))}
          </p>
          <p className="text-[11px] text-muted-foreground">{summary?.qr_count ?? 0} ta</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(q.trim());
            }}
            placeholder="Ism, telefon, hisob raqami…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setSearch(q.trim())}
          className="rounded-xl bg-foreground px-4 text-sm font-bold text-background"
        >
          Qidirish
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-bold">Sartarosh hisoblari</div>
          {listQ.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Hisob topilmadi.</div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.barber_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.barber_id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                      selectedId === r.barber_id && "bg-muted/50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{r.barber_name || r.barber_email}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {r.account_masked} · #{r.account_hash}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">
                        {formatAdminUzs(Number(r.balance))}
                      </p>
                      {r.is_locked ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-destructive">
                          <Lock className="size-3" /> Blok
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {!selectedId ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Wallet className="size-8 opacity-40" />
              Sartaroshni tanlang — tranzaksiyalar va payoutlar
            </div>
          ) : detailQ.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</div>
          ) : detailQ.data ? (
            <div className="space-y-4 p-4">
              <div>
                <p className="text-lg font-bold">{detailQ.data.barber.full_name || detailQ.data.barber.email}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {detailQ.data.account.account_number}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {formatAdminUzsFull(Number(detailQ.data.account.balance))}
                </p>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Hash className="size-3.5" /> Ledger
                </p>
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {detailQ.data.ledger.slice(0, 30).map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-xs"
                    >
                      <span className="font-semibold">{e.entry_type}</span>
                      <span className="tabular-nums font-bold">
                        {formatAdminUzs(Number(e.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Payoutlar
                </p>
                {detailQ.data.payouts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Yo&apos;q</p>
                ) : (
                  <ul className="space-y-2">
                    {detailQ.data.payouts.slice(0, 8).map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"
                      >
                        <span>{p.status}</span>
                        <span className="font-bold tabular-nums">
                          {formatAdminUzs(Number(p.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/admin/payouts"
                  className="mt-2 inline-block text-xs font-bold underline underline-offset-2"
                >
                  Barcha payoutlar →
                </Link>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  QR to&apos;lovlar
                </p>
                {detailQ.data.qr_payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Yo&apos;q</p>
                ) : (
                  <ul className="space-y-2">
                    {detailQ.data.qr_payments.slice(0, 8).map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs"
                      >
                        <span className="truncate">{p.payer_name}</span>
                        <span className="font-bold tabular-nums">
                          +{formatAdminUzs(Number(p.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-destructive">Yuklab bo&apos;lmadi</div>
          )}
        </div>
      </div>
    </div>
  );
}
