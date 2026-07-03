import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownAZ,
  ArrowUpDown,
  Loader2,
  Phone,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatUZS, useBarberContext } from "@/components/barber/BarberContext";
import { EmptyBlock, StatCard, UserAvatar } from "@/components/barber/primitives";
import { ClientImpressionBadges } from "@/components/bookings/ClientImpressionBadges";
import { prefetchBarberClients, useBarberClientsQuery } from "@/hooks/use-barber-queries";
import { readOnboardingStatusCache } from "@/lib/onboarding-status-cache";
import { cn } from "@/lib/utils";

type SortKey = "spent" | "visits" | "name";
type FilterKey = "all" | "new" | "returning";

export const Route = createFileRoute("/barber/clients")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  loader: ({ context: { queryClient } }) => {
    const cached = readOnboardingStatusCache();
    if (cached?.fully_ready !== true) return;
    void prefetchBarberClients(queryClient, "independent", null);
  },
  component: ClientsPage,
});

function mapClientRow(
  c: {
    id: number;
    full_name: string;
    phone: string;
    avatar?: string;
    completed_bookings: number;
    total_spent: string;
    classification?: string;
    impression_stats?: Record<string, number>;
  },
  lastVisitByCustomer: Map<string, string>,
) {
  const spent = Number(c.total_spent);
  return {
    id: String(c.id),
    name: c.full_name,
    avatar: c.avatar ?? "",
    phone: c.phone,
    visits: c.completed_bookings,
    spent: Number.isFinite(spent) ? spent : 0,
    last_visit: lastVisitByCustomer.get(String(c.id)) ?? "—",
    classification: c.classification === "new" ? "new" : "returning",
    impression_stats: c.impression_stats ?? {},
  };
}

function ClientsPage() {
  const { barberWorkMode, activeSalonId, bookings, fullyReady } = useBarberContext();
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [sort, setSort] = useState<SortKey>("spent");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortOpen, setSortOpen] = useState(false);

  const { data: apiClients, isLoading, isFetching } = useBarberClientsQuery(
    barberWorkMode,
    activeSalonId,
    fullyReady,
  );

  const lastVisitByCustomer = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (b.status !== "completed" || !b.customer_id) continue;
      const iso = b.date;
      const prev = map.get(b.customer_id);
      if (!prev || iso > prev) map.set(b.customer_id, iso);
    }
    return map;
  }, [bookings]);

  const clients = useMemo(
    () => (apiClients ?? []).map((c) => mapClientRow(c, lastVisitByCustomer)),
    [apiClients, lastVisitByCustomer],
  );

  const stats = useMemo(() => {
    const totalSpent = clients.reduce((s, c) => s + c.spent, 0);
    const returning = clients.filter((c) => c.visits >= 2).length;
    const fresh = clients.filter((c) => c.visits <= 1).length;
    return {
      total: clients.length,
      returning,
      fresh,
      totalSpent,
      avgSpent: clients.length ? Math.round(totalSpent / clients.length) : 0,
    };
  }, [clients]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = clients.filter(
      (c) =>
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        c.phone.replace(/\s/g, "").includes(needle.replace(/\s/g, "")),
    );
    if (filter === "new") rows = rows.filter((c) => c.visits <= 1);
    if (filter === "returning") rows = rows.filter((c) => c.visits >= 2);
    rows = [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "uz");
      if (sort === "visits") return b.visits - a.visits;
      return b.spent - a.spent;
    });
    return rows;
  }, [clients, filter, q, sort]);

  const sortLabel =
    sort === "spent" ? "Sarflagan" : sort === "visits" ? "Tashriflar" : "Ism";

  return (
    <div className="min-h-[calc(100dvh-4rem)] w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">
              Mijozlar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Siz xizmat ko&apos;rsatgan mijozlar bazasi. Ifodalar faqat siz belgilaganlar.
            </p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ism yoki telefon bo'yicha qidirish..."
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<Users className="size-4" />}
            label="Jami mijozlar"
            value={isLoading ? "…" : String(stats.total)}
            hint="Yakunlangan bronlar"
          />
          <StatCard
            icon={<UserPlus className="size-4" />}
            label="Yangi"
            value={isLoading ? "…" : String(stats.fresh)}
            hint="Birinchi tashrif"
          />
          <StatCard
            icon={<Sparkles className="size-4" />}
            label="Qaytuvchi"
            value={isLoading ? "…" : String(stats.returning)}
            hint="2+ tashrif"
          />
          <StatCard
            icon={<TrendingUp className="size-4" />}
            label="Jami daromad"
            value={isLoading ? "…" : formatUZS(stats.totalSpent)}
            hint={`O'rtacha ${formatUZS(stats.avgSpent)}`}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
            {(
              [
                ["all", "Barchasi"],
                ["new", "Yangi"],
                ["returning", "Qaytuvchi"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  filter === key
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium"
            >
              <ArrowUpDown className="size-4 text-muted-foreground" />
              Saralash: {sortLabel}
            </button>
            {sortOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Yopish"
                  className="fixed inset-0 z-20"
                  onClick={() => setSortOpen(false)}
                />
                <div className="absolute right-0 z-30 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                  {(
                    [
                      ["spent", "Sarflagan"],
                      ["visits", "Tashriflar"],
                      ["name", "Ism"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSort(key);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted",
                        sort === key && "bg-muted font-medium",
                      )}
                    >
                      <ArrowDownAZ className="size-3.5 text-muted-foreground" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {isLoading && !apiClients ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-border bg-card">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyBlock
            title="Hech qanday mijoz topilmadi"
            description="Filtr yoki qidiruvni o'zgartirib ko'ring."
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:block">
              <div className="grid grid-cols-12 gap-4 border-b border-border bg-muted/40 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                <div className="col-span-4">Mijoz</div>
                <div className="col-span-2">Telefon</div>
                <div className="col-span-1 text-center">Tashrif</div>
                <div className="col-span-2">So&apos;nggi</div>
                <div className="col-span-2 text-right">Sarflagan</div>
                <div className="col-span-1 text-right">Holat</div>
              </div>
              {filtered.map((c) => (
                <ClientTableRow key={c.id} client={c} />
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 lg:hidden">
              {filtered.map((c) => (
                <ClientCard key={c.id} client={c} />
              ))}
            </div>
          </>
        )}

        {isFetching && apiClients ? (
          <p className="text-center text-xs text-muted-foreground">Yangilanmoqda…</p>
        ) : null}
      </div>
    </div>
  );
}

type ClientRow = ReturnType<typeof mapClientRow>;

function ClientTableRow({ client: c }: { client: ClientRow }) {
  const phoneHref = c.phone ? `tel:${c.phone.replace(/\s/g, "")}` : undefined;
  return (
    <div className="grid grid-cols-12 items-center gap-4 border-b border-border px-6 py-4 transition-colors last:border-b-0 hover:bg-muted/30">
      <div className="col-span-4 flex min-w-0 items-center gap-3">
        <UserAvatar src={c.avatar} name={c.name} className="size-10 shrink-0" />
        <div className="min-w-0">
          <div className="truncate font-medium">{c.name}</div>
          <ClientImpressionBadges stats={c.impression_stats} className="mt-1" size="md" />
        </div>
      </div>
      <div className="col-span-2">
        {phoneHref ? (
          <a
            href={phoneHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Phone className="size-3.5" />
            {c.phone}
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
      <div className="col-span-1 text-center text-sm font-semibold tabular-nums">{c.visits}</div>
      <div className="col-span-2 text-sm text-muted-foreground">{c.last_visit}</div>
      <div className="col-span-2 text-right text-sm font-semibold tabular-nums">
        {formatUZS(c.spent)}
      </div>
      <div className="col-span-1 text-right">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
            c.visits <= 1
              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          )}
        >
          {c.visits <= 1 ? "Yangi" : "Qaytuvchi"}
        </span>
      </div>
    </div>
  );
}

function ClientCard({ client: c }: { client: ClientRow }) {
  const phoneHref = c.phone ? `tel:${c.phone.replace(/\s/g, "")}` : undefined;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <UserAvatar src={c.avatar} name={c.name} className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-base font-semibold">{c.name}</div>
          <ClientImpressionBadges stats={c.impression_stats} className="mt-1.5" size="md" />
        </div>
        <span className="shrink-0 font-heading text-sm font-semibold tabular-nums">
          {formatUZS(c.spent)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">Tashriflar</div>
          <div className="font-semibold tabular-nums">{c.visits}</div>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">So&apos;nggi</div>
          <div className="truncate font-medium">{c.last_visit}</div>
        </div>
      </div>
      {phoneHref ? (
        <a
          href={phoneHref}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted"
        >
          <Phone className="size-4" />
          Qo&apos;ng&apos;iroq
        </a>
      ) : null}
      <Link
        to="/barber/bookings"
        className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Bronlar tarixini ko&apos;rish
      </Link>
    </div>
  );
}
