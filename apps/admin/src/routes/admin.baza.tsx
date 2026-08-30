import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Database, Search } from "lucide-react";
import { toast } from "sonner";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
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
  downloadBazaExport,
  fetchBazaCountries,
  fetchBazaDataset,
  fetchBazaOverview,
  fetchBazaProducts,
  fetchBazaSearch,
  type BazaDatasetKind,
  type BazaDossier,
  type BazaHashRow,
  type BazaTxRow,
  type BazaUserRow,
  type BazaWalletRow,
} from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/baza")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    tab: typeof s.tab === "string" ? s.tab : "live",
  }),
  component: AdminBazaPage,
});

const TABS = [
  { id: "live", label: "Live statistika" },
  { id: "wallets", label: "Hamyonlar" },
  { id: "users", label: "User ID" },
  { id: "transactions", label: "Tranzaksiyalar" },
  { id: "hashes", label: "Hashlar" },
  { id: "search", label: "Qidiruv" },
  { id: "countries", label: "Davlat kodlari" },
  { id: "products", label: "Mahsulotlar" },
] as const;

const DATASET_TABS = new Set(["wallets", "users", "transactions", "hashes"]);

function isDatasetTab(tab: string): tab is BazaDatasetKind {
  return DATASET_TABS.has(tab);
}

function AdminBazaPage() {
  const navigate = useNavigate({ from: "/admin/baza" });
  const { q: qParam, tab } = Route.useSearch();
  const [draft, setDraft] = useState(qParam);
  const activeTab = TABS.some((t) => t.id === tab) ? tab : "live";
  const qTrim = qParam.trim();

  const overview = useQuery({
    queryKey: ["admin", "baza", "overview"],
    queryFn: fetchBazaOverview,
    refetchInterval: 20_000,
  });
  const countries = useQuery({
    queryKey: ["admin", "baza", "countries"],
    queryFn: fetchBazaCountries,
    enabled: activeTab === "countries",
  });
  const products = useQuery({
    queryKey: ["admin", "baza", "products", qTrim],
    queryFn: () => fetchBazaProducts(qTrim || undefined),
    enabled: activeTab === "products",
  });
  const search = useQuery({
    queryKey: ["admin", "baza", "search", qTrim],
    queryFn: () => fetchBazaSearch(qTrim),
    enabled: activeTab === "search" && qTrim.length >= 2,
  });
  const dataset = useQuery({
    queryKey: ["admin", "baza", "dataset", activeTab, qTrim],
    queryFn: () => fetchBazaDataset(activeTab as BazaDatasetKind, qTrim || undefined),
    enabled: isDatasetTab(activeTab),
  });

  const runSearch = (value: string) => {
    void navigate({ search: { q: value.trim(), tab: "search" } });
  };

  const exportKind = async (
    kind: "overview" | "countries" | "products" | "search" | BazaDatasetKind,
    format: "csv" | "json",
  ) => {
    try {
      await downloadBazaExport({ kind, format, q: qTrim || undefined });
      toast.success("Yuklab olindi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklab bo'lmadi");
    }
  };

  const headerExportKind =
    activeTab === "live"
      ? "overview"
      : activeTab === "search" || activeTab === "countries" || activeTab === "products" || isDatasetTab(activeTab)
        ? activeTab
        : "overview";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Ekotizim
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">Baza</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            ID, hash, hamyon, ism yoki barcode qidirilsa — userga bog‘langan barcha ma’lumot chiqadi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => exportKind(headerExportKind, "csv")}>
            <Download className="size-4" />
            CSV
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => exportKind(headerExportKind, "json")}>
            <Download className="size-4" />
            JSON
          </Button>
        </div>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(draft);
        }}
      >
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="rounded-full pl-9"
            placeholder="Ism, telefon, hamyon, hash, barcode, user ID..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button type="submit" className="rounded-full">
          Qidirish
        </Button>
      </form>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/80 p-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => void navigate({ search: { q: qParam, tab: item.id } })}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium",
              activeTab === item.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === "live" ? (
        overview.isLoading ? (
          <CardSkeleton className="h-48" />
        ) : overview.data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Foydalanuvchilar" value={overview.data.users} icon={Database} />
            <KPICard label="Sartaroshlar" value={overview.data.barbers} />
            <KPICard label="Salonlar" value={overview.data.salons} />
            <KPICard label="Hamyonlar" value={overview.data.wallets} />
            <KPICard label="Hamyon jami" value={formatAdminUzs(overview.data.wallet_balance_sum)} />
            <KPICard label="Tranzaksiyalar" value={overview.data.ledger_entries} />
            <KPICard label="Sovg'alar" value={overview.data.gifts} />
            <KPICard label="Bronlar" value={overview.data.bookings} />
            <KPICard label="Qurilmalar" value={overview.data.sessions} />
            <KPICard label="Mahsulotlar" value={overview.data.care_products} />
            <KPICard label="Ko'rishlar" value={overview.data.care_views} />
            <KPICard label="Kliklar" value={overview.data.care_clicks} />
            <KPICard label="GS1 kodlar" value={overview.data.gs1_codes} />
            <KPICard label="Like" value={overview.data.care_likes} />
          </div>
        ) : (
          <EmptyState title="Statistika yo'q" description="Qayta urinib ko'ring." />
        )
      ) : null}

      {activeTab === "live" && overview.data ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {(
            [
              { kind: "wallets", title: "Hamyonlar", count: overview.data.wallets },
              { kind: "users", title: "User ID", count: overview.data.users },
              { kind: "transactions", title: "Tranzaksiyalar", count: overview.data.ledger_entries },
              { kind: "hashes", title: "Hashlar", count: overview.data.ledger_entries },
            ] as const
          ).map((col) => (
            <div key={col.kind} className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {col.title}
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold">{col.count}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  onClick={() => void navigate({ search: { q: qParam, tab: col.kind } })}
                >
                  Ro'yxat
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => exportKind(col.kind, "csv")}
                >
                  <Download className="size-3.5" />
                  CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => exportKind(col.kind, "json")}
                >
                  JSON
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "search" ? (
        search.isLoading ? (
          <CardSkeleton className="h-64" />
        ) : !qTrim ? (
          <EmptyState title="Qidiruv" description="Ism, hash, hamyon yoki ID kiriting." />
        ) : !search.data?.ok ? (
          <EmptyState title="Topilmadi" description="Boshqa identifikator bilan qidiring." />
        ) : (
          <div className="space-y-6">
            {search.data.dossiers.map((dossier) => (
              <DossierCard key={dossier.user.id} dossier={dossier} />
            ))}
          </div>
        )
      ) : null}

      {activeTab === "countries" ? (
        countries.isLoading ? (
          <CardSkeleton className="h-64" />
        ) : (
          <CountryTable rows={countries.data?.results || []} />
        )
      ) : null}

      {activeTab === "products" ? (
        products.isLoading ? (
          <CardSkeleton className="h-64" />
        ) : (
          <ProductTable rows={products.data?.results || []} />
        )
      ) : null}

      {isDatasetTab(activeTab) ? (
        dataset.isLoading ? (
          <CardSkeleton className="h-64" />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {dataset.data?.count ?? 0} ta yozuv (qidiruv joriy tabni filtrlashi mumkin)
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => exportKind(activeTab, "csv")}>
                  <Download className="size-3.5" />
                  {activeTab} CSV
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => exportKind(activeTab, "json")}>
                  {activeTab} JSON
                </Button>
              </div>
            </div>
            {activeTab === "wallets" ? (
              <WalletTable rows={(dataset.data?.results || []) as BazaWalletRow[]} />
            ) : null}
            {activeTab === "users" ? (
              <UserIdTable rows={(dataset.data?.results || []) as BazaUserRow[]} />
            ) : null}
            {activeTab === "transactions" ? (
              <TxTable rows={(dataset.data?.results || []) as BazaTxRow[]} />
            ) : null}
            {activeTab === "hashes" ? (
              <HashTable rows={(dataset.data?.results || []) as BazaHashRow[]} />
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

function DossierCard({ dossier }: { dossier: BazaDossier }) {
  const u = dossier.user;
  const sections = useMemo(
    () => [
      { title: "Manzillar", count: dossier.addresses.length },
      { title: "Qurilmalar", count: dossier.devices.length },
      { title: "Tranzaksiyalar", count: dossier.transactions.length },
      { title: "Sovg'alar", count: dossier.gifts.length },
      { title: "Bronlar", count: dossier.bookings.length },
      { title: "Like", count: dossier.liked_products.length },
      { title: "Ko'rilgan mahsulotlar", count: dossier.seen_products.length },
    ],
    [dossier],
  );
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">{u.full_name || u.phone || `User #${u.id}`}</h2>
          <p className="text-sm text-muted-foreground">
            #{u.id} · {u.phone || "telefon yo'q"} · {u.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sections.map((s) => (
            <Badge key={s.title} variant="secondary">
              {s.title}: {s.count}
            </Badge>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        <Info label="Hamyon" value={dossier.wallet?.wallet_number || "—"} />
        <Info label="Balans" value={dossier.wallet ? formatAdminUzs(dossier.wallet.balance) : "—"} />
        <Info label="Viloyat" value={u.region || "—"} />
        <Info label="Sartarosh" value={dossier.barber?.full_name || "yo'q"} />
        <Info label="GPS" value={u.latitude && u.longitude ? `${u.latitude}, ${u.longitude}` : "—"} />
        <Info label="Oxirgi kirish" value={u.last_login?.slice(0, 19) || "—"} />
      </div>
      {dossier.addresses.length ? (
        <Block title="Manzillar">
          {dossier.addresses.map((a) => (
            <p key={a.id} className="text-sm text-muted-foreground">
              {a.label}: {a.address_line} ({a.region})
            </p>
          ))}
        </Block>
      ) : null}
      {dossier.devices.length ? (
        <Block title="Qurilmalar / API sessiya">
          {dossier.devices.slice(0, 8).map((d) => (
            <p key={d.id} className="text-sm text-muted-foreground">
              {d.device_name || d.platform || "qurilma"} · {d.client_kind} · {d.app_version || "—"} · {d.ip_address || "IP yo'q"}
            </p>
          ))}
        </Block>
      ) : null}
      {dossier.transactions.length ? (
        <Block title="Hamyon tranzaksiyalari">
          <div className="max-h-56 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Turi</TableHead>
                  <TableHead>Summa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossier.transactions.slice(0, 30).map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.id.slice(0, 8)}</TableCell>
                    <TableCell>{tx.entry_type}</TableCell>
                    <TableCell>{formatAdminUzs(tx.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Block>
      ) : null}
      {dossier.gifts.length ? (
        <Block title="Sovg'alar">
          {dossier.gifts.slice(0, 12).map((g) => (
            <p key={g.id} className="text-sm text-muted-foreground">
              {g.direction === "out" ? "Yuborildi" : "Qabul"} · {formatAdminUzs(g.amount)} · {g.from_user} → {g.to_user} · {g.status}
            </p>
          ))}
        </Block>
      ) : null}
      {dossier.seen_products.length || dossier.liked_products.length ? (
        <Block title="Mahsulotlar">
          {dossier.seen_products.map((p) => (
            <p key={`s-${p.product_id}`} className="text-sm text-muted-foreground">
              Ko‘rdi: {p.product_name} · view {p.views} · click {p.clicks}
            </p>
          ))}
          {dossier.liked_products.map((p) => (
            <p key={`l-${p.product_id}`} className="text-sm text-muted-foreground">
              Like: {p.product_name}
            </p>
          ))}
        </Block>
      ) : null}
    </section>
  );
}

function CountryTable({ rows }: { rows: Array<{ prefix_label: string; country_name: string; iso: string; flag: string; flag_url?: string }> }) {
  if (!rows.length) return <EmptyState title="Kodlar yo'q" description="Migration ishga tushirilmagan." />;
  return (
    <div className="overflow-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bayroq</TableHead>
            <TableHead>Kod</TableHead>
            <TableHead>Davlat</TableHead>
            <TableHead>ISO</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.prefix_label}>
              <TableCell>
                <span className="inline-flex items-center gap-2 text-xl">
                  {row.flag_url ? <img src={row.flag_url} alt="" className="h-5 w-7 rounded-sm object-cover" /> : null}
                  {row.flag}
                </span>
              </TableCell>
              <TableCell className="font-mono">{row.prefix_label}</TableCell>
              <TableCell>{row.country_name}</TableCell>
              <TableCell>{row.iso || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ProductTable({
  rows,
}: {
  rows: Array<{
    id: number;
    name: string;
    brand: string;
    barcode: string;
    country_of_origin: string;
    flag: string;
    views_count: number;
    clicks_count: number;
    viewers_count: number;
    clickers_count: number;
    likes_count: number;
    ingredients_text: string;
  }>;
}) {
  if (!rows.length) return <EmptyState title="Mahsulot yo'q" description="Tarkibga mahsulot qo‘shing." />;
  return (
    <div className="overflow-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mahsulot</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>Davlat</TableHead>
            <TableHead>Ko‘rdi</TableHead>
            <TableHead>Bosdi</TableHead>
            <TableHead>Like</TableHead>
            <TableHead>Tarkib</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.brand}</div>
              </TableCell>
              <TableCell className="font-mono text-xs">{row.barcode || "—"}</TableCell>
              <TableCell>
                {row.flag} {row.country_of_origin || "—"}
              </TableCell>
              <TableCell>
                {row.viewers_count} kishi / {row.views_count}
              </TableCell>
              <TableCell>
                {row.clickers_count} kishi / {row.clicks_count}
              </TableCell>
              <TableCell>{row.likes_count}</TableCell>
              <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                {row.ingredients_text || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function WalletTable({ rows }: { rows: BazaWalletRow[] }) {
  if (!rows.length) return <EmptyState title="Hamyon yo'q" description="Hali hamyon ochilmagan." />;
  return (
    <div className="overflow-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hamyon</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Ism</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Balans</TableHead>
            <TableHead>Holat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.wallet_id}>
              <TableCell className="font-mono text-xs">{row.wallet_number}</TableCell>
              <TableCell>{row.user_id}</TableCell>
              <TableCell>{row.full_name || "—"}</TableCell>
              <TableCell>{row.phone || "—"}</TableCell>
              <TableCell>{formatAdminUzs(row.balance)}</TableCell>
              <TableCell>{row.is_frozen ? "Muzlatilgan" : "Faol"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UserIdTable({ rows }: { rows: BazaUserRow[] }) {
  if (!rows.length) return <EmptyState title="User yo'q" description="Qidiruvni o'zgartiring." />;
  return (
    <div className="overflow-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Ism</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Hamyon</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.user_id}>
              <TableCell>{row.user_id}</TableCell>
              <TableCell>{row.full_name || "—"}</TableCell>
              <TableCell>{row.phone || "—"}</TableCell>
              <TableCell className="text-xs">{row.email}</TableCell>
              <TableCell className="font-mono text-xs">{row.wallet_number || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TxTable({ rows }: { rows: BazaTxRow[] }) {
  if (!rows.length) return <EmptyState title="Tranzaksiya yo'q" description="Hali yozuv yo'q." />;
  return (
    <div className="overflow-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Turi</TableHead>
            <TableHead>Summa</TableHead>
            <TableHead>Hamyon</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Hash</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
              <TableCell>{row.entry_type}</TableCell>
              <TableCell>{formatAdminUzs(row.amount)}</TableCell>
              <TableCell className="font-mono text-xs">{row.wallet_number}</TableCell>
              <TableCell>
                #{row.user_id} {row.full_name}
              </TableCell>
              <TableCell className="font-mono text-xs">{row.entry_hash.slice(0, 12)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function HashTable({ rows }: { rows: BazaHashRow[] }) {
  if (!rows.length) return <EmptyState title="Hash yo'q" description="Ledger bo'sh." />;
  return (
    <div className="overflow-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ledger ID</TableHead>
            <TableHead>entry_hash</TableHead>
            <TableHead>prev_hash</TableHead>
            <TableHead>Hamyon</TableHead>
            <TableHead>User ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.ledger_id}>
              <TableCell className="font-mono text-xs">{row.ledger_id}</TableCell>
              <TableCell className="font-mono text-xs">{row.entry_hash}</TableCell>
              <TableCell className="font-mono text-xs">{row.prev_hash}</TableCell>
              <TableCell className="font-mono text-xs">{row.wallet_number}</TableCell>
              <TableCell>{row.user_id ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium break-all">{value}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}
