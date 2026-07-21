import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Download,
  Gift,
  Hash,
  LayoutGrid,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadAdminGiftsCsv,
  fetchAdminGiftDetail,
  fetchAdminGifts,
  PAGE_SIZE,
  type AdminGiftTransfer,
} from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { LiveMoneyHero } from "@/components/admin/LiveMoneyHero";
import { KPICard } from "@/components/admin/KPICard";
import { Pagination } from "@/components/admin/Pagination";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { LivePulseBadge } from "@/components/admin/LiveMetricHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useStatsRange, StatsRangePicker } from "@/components/admin/StatisticsShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/finance/gifts")({
  component: AdminGiftsPage,
});

const DESIGNS = [
  { id: "all", label: "Barcha dizaynlar" },
  { id: "classic", label: "Klassik" },
  { id: "soft", label: "Yumshoq krem" },
  { id: "midnight", label: "Tun" },
  { id: "bloom", label: "Gul" },
  { id: "forest", label: "O'rmon" },
  { id: "prestige", label: "Nufuz" },
  { id: "royal", label: "Qirollik" },
  { id: "legend", label: "Afsona" },
] as const;

function stepIcon(status: string) {
  if (status === "passed") return <CheckCircle2 className="size-4 text-emerald-600" />;
  if (status === "failed") return <XCircle className="size-4 text-destructive" />;
  return <Circle className="size-4 text-muted-foreground" />;
}

function SecurityRail({ gift }: { gift: AdminGiftTransfer }) {
  const steps = gift.security_steps ?? [];
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {steps.map((s) => (
        <div
          key={s.key}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]",
            s.status === "passed"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800"
              : s.status === "failed"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border bg-muted/40 text-muted-foreground",
          )}
          title={s.detail}
        >
          {stepIcon(s.status)}
          <span className="font-medium">
            {s.step}. {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function GiftDetailSheet({
  giftId,
  open,
  onOpenChange,
}: {
  giftId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const detailQ = useQuery({
    queryKey: ["admin", "gift-detail", giftId],
    queryFn: () => fetchAdminGiftDetail(giftId!),
    enabled: open && !!giftId,
  });

  const g = detailQ.data;
  const trail = g?.spend_trail;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-heading">Sovg&apos;a tranzaksiyasi</SheetTitle>
          <SheetDescription>
            Merchant ID, xavfsizlik bosqichlari va pul qayerga ketgani.
          </SheetDescription>
        </SheetHeader>

        {detailQ.isLoading || !g ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-violet-500/10 via-background to-background p-4">
              <div className="flex items-center justify-between gap-2">
                <LivePulseBadge label="Sealed" />
                <code className="text-[11px] font-mono text-muted-foreground">
                  {g.merchant_tx_id || g.id}
                </code>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Yuboruvchi</p>
                  <p className="truncate font-semibold">{g.sender.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {g.sender.wallet_number || g.sender.phone || "—"}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-xs text-muted-foreground">Qabul qiluvchi</p>
                  <p className="truncate font-semibold">{g.recipient.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {g.recipient.wallet_number || g.recipient.phone || "—"}
                  </p>
                </div>
              </div>
              <p className="mt-4 font-heading text-3xl font-bold tabular-nums">
                {formatAdminUzs(g.amount)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dizayn: {g.design_name} · +{formatAdminUzs(g.design_fee)} · jami{" "}
                {formatAdminUzs(g.total_charged)}
              </p>
            </div>

            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4" />
                Xavfsizlik bosqichlari
              </h3>
              <ol className="mt-3 space-y-2">
                {(g.security_steps ?? []).map((s) => (
                  <li
                    key={s.key}
                    className="flex gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="mt-0.5">{stepIcon(s.status)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {s.step}. {s.label}
                        </p>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {s.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
                      {s.merchant_tx_id ? (
                        <code className="mt-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                          <Hash className="size-3 opacity-50" />
                          {s.merchant_tx_id}
                        </code>
                      ) : null}
                      {s.entry_hash ? (
                        <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                          hash:{s.entry_hash}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Qabul qiluvchi sarfi</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Sovg&apos;a pulidan keyin qaysi salon/xizmatga hamyon bilan to&apos;langani
              </p>
              {trail ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[11px] text-muted-foreground">Sovg&apos;a</p>
                    <p className="font-semibold tabular-nums">{formatAdminUzs(trail.gift_amount)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[11px] text-muted-foreground">Sarflangan</p>
                    <p className="font-semibold tabular-nums text-amber-700">
                      {formatAdminUzs(trail.spent_total)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[11px] text-muted-foreground">Qoldiq (taxmin)</p>
                    <p className="font-semibold tabular-nums">
                      {formatAdminUzs(trail.remaining_estimate)}
                    </p>
                  </div>
                </div>
              ) : null}
              {!trail?.items?.length ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Hali bron to&apos;lovi yo&apos;q — pul hamyonda turibdi.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {trail.items.map((item) => (
                    <li
                      key={item.ledger_id}
                      className="rounded-xl border border-border bg-card p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.salon_name || "Salon"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.barber_name || "Sartarosh"} ·{" "}
                            {(item.services || []).join(", ") || "Xizmat"}
                          </p>
                        </div>
                        <span className="font-semibold tabular-nums">
                          {formatAdminUzs(item.amount)}
                        </span>
                      </div>
                      <code className="mt-2 block truncate text-[10px] font-mono text-muted-foreground">
                        TX {item.merchant_tx_id}
                        {item.booking_id ? ` · bron #${item.booking_id}` : ""}
                      </code>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {g.message ? (
              <section>
                <h3 className="text-sm font-semibold">Xabar</h3>
                <p className="mt-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  {g.message}
                </p>
              </section>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AdminGiftsPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("90d");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [designId, setDesignId] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const giftsQ = useQuery({
    queryKey: ["admin", "gifts", search, designId, range.start, range.end, page],
    queryFn: () =>
      fetchAdminGifts({
        q: search || undefined,
        design_id: designId,
        start: range.start,
        end: range.end,
        page,
      }),
    refetchInterval: 8_000,
    refetchIntervalInBackground: true,
  });

  const data = giftsQ.data?.results ?? [];
  const summary = giftsQ.data?.summary;
  const pag = giftsQ.data;

  const applySearch = () => {
    setSearch(q.trim());
    setPage(1);
  };

  const onExport = async () => {
    try {
      await downloadAdminGiftsCsv({
        start: range.start,
        end: range.end,
        design_id: designId,
      });
      toast.success("Yuklab olindi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklab olishda xatolik");
    }
  };

  const openGift = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              Sovg&apos;a oqimi
            </h1>
            <LivePulseBadge label="Live" />
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Kim kimga yuboryapti, 5 bosqichli xavfsizlik zanjiri, merchant TX va sarf izi —
            real vaqtda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/finance/gift-designs">
              <LayoutGrid className="size-4" />
              Dizaynlar
            </Link>
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={onExport}>
            <Download className="size-4" />
            Yuklab olish
          </Button>
          <StatsRangePicker
            value={rangeKey}
            onChange={(v) => {
              setRangeKey(v);
              setPage(1);
            }}
          />
        </div>
      </div>

      {giftsQ.isLoading && !summary ? (
        <CardSkeleton className="min-h-[180px]" />
      ) : (
        <LiveMoneyHero
          label="Sovg'a aylanmasi"
          valueUzs={summary?.amount_total ?? 0}
          todayDeltaUzs={summary?.today_amount}
          icon={Gift}
          accent="purple"
          sublabel={`${summary?.count ?? 0} ta o'tkazma · dizayn daromadi ${formatAdminUzs(summary?.design_fee_total ?? 0)} · 8 soniyada yangilanadi`}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!summary ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Sovg'alar" value={summary.count} icon={Gift} />
            <KPICard
              label="Dizayn to'lovlari"
              value={formatAdminUzs(summary.design_fee_total)}
              hint="Platforma"
            />
            <KPICard label="Jami yechilgan" value={formatAdminUzs(summary.charged_total)} />
            <KPICard
              label="Bugun"
              value={summary.today_count ?? 0}
              hint={
                summary.today_amount
                  ? formatAdminUzs(summary.today_amount)
                  : "Hali yo'q"
              }
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/80 p-4 backdrop-blur sm:flex-row sm:items-end">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder="Ism, telefon, merchant TX, dizayn..."
            className="pl-9"
          />
        </div>
        <Select
          value={designId}
          onValueChange={(v) => {
            setDesignId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Dizayn" />
          </SelectTrigger>
          <SelectContent>
            {DESIGNS.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={applySearch}>
          Qidirish
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold">Jonli oqim</h2>
          <p className="text-xs text-muted-foreground">Kartani bosing — to&apos;liq iz</p>
        </div>

        {giftsQ.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} className="min-h-[120px]" />
            ))}
          </div>
        ) : giftsQ.isError ? (
          <EmptyState title="Yuklanmadi" description="Sovg'a oqimini yuklab bo'lmadi." />
        ) : data.length === 0 ? (
          <EmptyState title="Sovg'a topilmadi" description="Tanlangan filtrlar bo'yicha yozuv yo'q." />
        ) : (
          <>
            <div className="space-y-3">
              {data.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => openGift(g.id)}
                  className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-card transition hover:border-violet-500/40 hover:ring-1 hover:ring-violet-500/20 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-800">
                          {g.design_name}
                        </span>
                        <code className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                          <Hash className="size-3" />
                          {(g.merchant_tx_id || g.id).slice(0, 13)}…
                        </code>
                        <span className="text-xs text-muted-foreground">
                          {g.created_at
                            ? format(new Date(g.created_at), "dd MMM yyyy HH:mm:ss")
                            : "—"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold">{g.sender.name}</span>
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                        <span className="font-semibold">{g.recipient.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {g.sender.phone || g.sender.wallet_number || "—"} →{" "}
                        {g.recipient.phone || g.recipient.wallet_number || "—"}
                      </p>
                      <SecurityRail gift={g} />
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-heading text-2xl font-bold tabular-nums">
                        {formatAdminUzs(g.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        dizayn {formatAdminUzs(g.design_fee)}
                      </p>
                      <p className="mt-2 text-xs font-medium text-violet-700">Batafsil →</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {pag ? (
              <Pagination
                page={pag.page}
                totalPages={pag.total_pages}
                count={pag.count}
                pageSize={pag.page_size || PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>

      <GiftDetailSheet giftId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
