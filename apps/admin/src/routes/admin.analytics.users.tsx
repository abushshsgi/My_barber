import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import {
  AnalyticsError,
  AnalyticsSkeleton,
  FetchBar,
  SectionIntro,
  errorText,
} from "@/components/admin/analytics-shell";
import { JourneyTimeline, Pager, formatStamp } from "@/components/admin/analytics-blocks";
import {
  analyticsQuery,
  fetchAnalyticsJourney,
  fetchAnalyticsUsers,
} from "@/lib/revenue-analytics";
import { cn } from "@/lib/utils";

const FILTERS = [
  ["all", "Hammasi"],
  ["registered", "Ro'yxatdan o'tgan"],
  ["anonymous", "Anonim"],
  ["premium_viewers", "Premium"],
  ["subscribe_clickers", "Obuna tugmasi"],
  ["payment_starters", "To'lov boshlagan"],
  ["payment_abandoners", "Tashlab ketgan"],
  ["paying_subscribers", "To'lagan"],
  ["ai_tryon", "AI try-on"],
  ["shampoo_scanner", "Shampun skaner"],
] as const;

export const Route = createFileRoute("/admin/analytics/users")({
  component: UsersPage,
});

function UsersPage() {
  const period = useAnalyticsPeriod();
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [journeyPage, setJourneyPage] = useState(1);
  const scope = `${period.preset}|${period.start}|${period.end}|${kind}`;
  const [seenScope, setSeenScope] = useState(scope);
  if (scope !== seenScope) {
    setSeenScope(scope);
    setPage(1);
    setSelected(null);
    setJourneyPage(1);
  }
  const queryText = analyticsQuery(period.preset, period.start, period.end, {
    kind,
    page: String(page),
  });
  const query = useQuery({
    queryKey: ["analytics", "users", queryText],
    queryFn: () => fetchAnalyticsUsers(queryText),
    placeholderData: keepPreviousData,
  });
  const journey = useQuery({
    queryKey: ["analytics", "journey", selected, journeyPage],
    queryFn: () => fetchAnalyticsJourney(selected!, journeyPage),
    enabled: Boolean(selected),
  });

  const needle = search.trim().toLowerCase();
  const rows = (query.data?.results ?? []).filter((row) => {
    if (!needle) return true;
    return `${row.label} ${row.source} ${row.device}`.toLowerCase().includes(needle);
  });

  return (
    <div className="space-y-4">
      <FetchBar active={query.isFetching || journey.isFetching} />
      <SectionIntro
        title="Foydalanuvchi yo'li"
        description="Chapda davr ichidagi odamlar. O'ngda sahifalar, Premium, to'lov va obuna. Qidiruv joriy sahifani filtrlaydi."
      />
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors",
              kind === value
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {query.isPending && !query.data ? <AnalyticsSkeleton rows={1} /> : null}
      {query.isError ? (
        <AnalyticsError message={errorText(query.error)} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-36 lg:max-h-[calc(100dvh-11rem)] lg:overflow-auto">
            <div className="sticky top-0 z-10 border-b border-border bg-card p-3">
              <label className="flex items-center gap-2 rounded-lg border border-border px-2.5">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Shu sahifada qidirish"
                  className="h-9 w-full bg-transparent text-sm outline-none"
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                {query.data.count.toLocaleString("uz-UZ")} ta
              </p>
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Hech kim topilmadi.
              </p>
            ) : (
              <ul>
                {rows.map((row) => {
                  const active = selected === row.id;
                  return (
                    <li key={row.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(row.id);
                          setJourneyPage(1);
                        }}
                        className={cn(
                          "flex w-full flex-col px-3 py-3 text-left transition-colors",
                          active ? "bg-foreground text-background" : "hover:bg-muted/70",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{row.label || row.id}</span>
                          <span
                            className={cn(
                              "shrink-0 text-[11px]",
                              active ? "text-background/70" : "text-muted-foreground",
                            )}
                          >
                            {row.registered ? "A'zo" : "Mehmon"}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "mt-1 flex justify-between gap-2 text-xs",
                            active ? "text-background/70" : "text-muted-foreground",
                          )}
                        >
                          <span className="truncate">
                            {row.source || "unknown"} · {row.device || "—"}
                          </span>
                          <span className="shrink-0">{formatStamp(row.last_seen)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t border-border p-3">
              <Pager
                page={page}
                onPage={setPage}
                hasPrev={page > 1}
                hasNext={page * 25 < query.data.count}
              />
            </div>
          </section>
          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
            {!selected ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <p className="font-heading text-lg font-semibold">Odamni tanlang</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Sahifalar, Premium, to'lov urinishlari va obuna holati shu yerda vaqt tartibida
                  ochiladi.
                </p>
              </div>
            ) : journey.isPending ? (
              <p className="text-sm text-muted-foreground">Yo'l yuklanmoqda…</p>
            ) : journey.isError ? (
              <AnalyticsError
                message={errorText(journey.error)}
                onRetry={() => void journey.refetch()}
              />
            ) : journey.data ? (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Link
                    to="/admin/analytics/users/$userId"
                    params={{ userId: selected }}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    To'liq sahifa
                  </Link>
                </div>
                <JourneyTimeline data={journey.data} page={journeyPage} onPage={setJourneyPage} />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
