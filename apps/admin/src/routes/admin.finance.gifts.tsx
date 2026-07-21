import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Gift, Search } from "lucide-react";
import { fetchAdminGifts, PAGE_SIZE } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { Pagination } from "@/components/admin/Pagination";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function AdminGiftsPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("90d");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [designId, setDesignId] = useState("all");
  const [page, setPage] = useState(1);

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
  });

  const data = giftsQ.data?.results ?? [];
  const summary = giftsQ.data?.summary;
  const pag = giftsQ.data;

  const applySearch = () => {
    setSearch(q.trim());
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
            <Gift className="size-7" />
            Sovg&apos;a kartalar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mijozlar kimga, qachon, qancha va qaysi dizayn bilan sovg&apos;a yuborgani.
          </p>
        </div>
        <StatsRangePicker
          value={rangeKey}
          onChange={(v) => {
            setRangeKey(v);
            setPage(1);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {giftsQ.isLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Sovg'alar" value={summary.count} icon={Gift} />
            <KPICard label="Sovg'a summasi" value={formatAdminUzs(summary.amount_total)} />
            <KPICard
              label="Dizayn to'lovlari"
              value={formatAdminUzs(summary.design_fee_total)}
              hint="Platforma daromadi"
            />
            <KPICard label="Jami yechilgan" value={formatAdminUzs(summary.charged_total)} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-end">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder="Yuboruvchi, qabul qiluvchi, dizayn..."
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

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {giftsQ.isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : giftsQ.isError ? (
          <EmptyState
            title="Yuklanmadi"
            description="Sovg'a kartalarni yuklab bo'lmadi."
            className="py-12"
          />
        ) : data.length === 0 ? (
          <EmptyState
            title="Sovg'a topilmadi"
            description="Tanlangan filtrlar bo'yicha yozuv yo'q."
            className="py-12"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium sm:px-6">Yuboruvchi</th>
                    <th className="px-4 py-3 font-medium sm:px-6">Qabul qiluvchi</th>
                    <th className="px-4 py-3 font-medium sm:px-6">Dizayn</th>
                    <th className="px-4 py-3 text-right font-medium sm:px-6">Sovg&apos;a</th>
                    <th className="px-4 py-3 text-right font-medium sm:px-6">Dizayn narxi</th>
                    <th className="px-4 py-3 font-medium sm:px-6">Xabar</th>
                    <th className="px-4 py-3 font-medium sm:px-6">Vaqt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((g) => (
                    <tr key={g.id} className="hover:bg-background/50">
                      <td className="px-4 py-3 sm:px-6">
                        {g.sender.id ? (
                          <Link
                            to="/admin/users/$userId"
                            params={{ userId: String(g.sender.id) }}
                            className="font-medium text-foreground hover:underline"
                          >
                            {g.sender.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{g.sender.name}</span>
                        )}
                        {g.sender.phone ? (
                          <div className="text-xs text-muted-foreground">{g.sender.phone}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        {g.recipient.id ? (
                          <Link
                            to="/admin/users/$userId"
                            params={{ userId: String(g.recipient.id) }}
                            className="font-medium text-foreground hover:underline"
                          >
                            {g.recipient.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{g.recipient.name}</span>
                        )}
                        {g.recipient.phone ? (
                          <div className="text-xs text-muted-foreground">{g.recipient.phone}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {g.design_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium sm:px-6">
                        {formatAdminUzs(g.amount)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums sm:px-6",
                          g.design_fee > 0 ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {formatAdminUzs(g.design_fee)}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground sm:px-6">
                        {g.message || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground sm:px-6">
                        {g.created_at ? format(new Date(g.created_at), "dd MMM yyyy HH:mm") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  );
}
