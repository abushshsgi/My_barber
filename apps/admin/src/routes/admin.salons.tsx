import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  MapPin,
  MoreHorizontal,
  Phone,
  Star,
  Trash2,
  User,
  Users,
  MessageCircle,
  Store,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAdminSalons, patchAdminSalon, deleteAdminSalon, PAGE_SIZE } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { uzRegionLabel } from "@/lib/uz-regions";
import type { AdminSalon } from "@/lib/admin-api";
import { FilterToolbar } from "@/components/admin/FilterToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_TABS = [
  { key: "all" as const, label: "Hammasi" },
  { key: "published" as const, label: "Chiqarilgan" },
  { key: "pending" as const, label: "Tekshiruvda" },
];

export const Route = createFileRoute("/admin/salons")({
  validateSearch: (raw: Record<string, unknown>) => {
    const pageRaw = raw.page;
    let page = 1;
    if (typeof pageRaw === "number" && Number.isFinite(pageRaw) && pageRaw >= 1) {
      page = Math.floor(pageRaw);
    } else if (typeof pageRaw === "string") {
      const n = Number(pageRaw);
      if (Number.isFinite(n) && n >= 1) page = Math.floor(n);
    }
    const st = raw.status;
    const status =
      st === "published" || st === "pending" || st === "all" ? st : "all";
    return {
      q: typeof raw.q === "string" ? raw.q : "",
      region: typeof raw.region === "string" ? raw.region : "",
      status,
      page,
    };
  },
  component: SalonsPage,
});

function SalonsPage() {
  const parts = useRouterState({
    select: (s) => s.location.pathname.split("/").filter(Boolean),
  });
  const isSalonDetail = parts.length >= 3 && parts[0] === "admin" && parts[1] === "salons";
  if (isSalonDetail) {
    return <Outlet />;
  }
  return <SalonsListPage />;
}

function SalonsListPage() {
  const search = Route.useSearch();
  const q = search.q;
  const region = search.region;
  const status = search.status;
  const page = search.page;
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<AdminSalon | null>(null);

  const publishedParam: boolean | "all" = status === "all" ? "all" : status === "published";

  const salonsQ = useQuery({
    queryKey: ["admin", "salons", { q, region, status, page }],
    queryFn: () => fetchAdminSalons({ q, region, published: publishedParam, page }),
  });

  const patchSalon = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof patchAdminSalon>[1] }) =>
      patchAdminSalon(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "salons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Salon yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSalon = useMutation({
    mutationFn: (id: string) => deleteAdminSalon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "salons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setDeleteTarget(null);
      toast.success("Salon o'chirildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = salonsQ.data;

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6 lg:max-w-6xl">
        {/* Sarlavha — ixcham, natijaga yo‘naltirilgan */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Store className="size-[1.15rem]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Salonlar
              </h1>
              <p className="text-xs text-muted-foreground">
                MySalon salonlari · egasi, bronlar, daromad · qator — batafsil
              </p>
            </div>
          </div>
          {!salonsQ.isLoading && data ? (
            <p className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{data.count}</span> ta
              <span className="mx-1.5 text-border">·</span>
              sahifa {data.page}/{data.total_pages}
            </p>
          ) : null}
        </div>

        {/* Bitta filtr paneli — yon ustun yo‘q, asosiy joy keng */}
        <div className="mb-6 space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
          <FilterToolbar
            className="flex-col gap-3 md:flex-row md:flex-wrap md:items-center"
            search={q}
            onSearchChange={(v) =>
              navigate({ search: (prev) => ({ ...prev, q: v, page: 1 }) })
            }
            region={region}
            onRegionChange={(v) =>
              navigate({ search: (prev) => ({ ...prev, region: v, page: 1 }) })
            }
            searchPlaceholder="Salon, egasi, telefon yoki manzil..."
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">
              Chop etish holati
            </p>
            <div className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() =>
                    navigate({ search: (prev) => ({ ...prev, status: t.key, page: 1 }) })
                  }
                  className={cn(
                    "min-h-9 flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold transition-all sm:flex-none sm:px-4",
                    status === t.key
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/80"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="min-w-0">
          {salonsQ.isLoading ? (
            <TableSkeleton rows={8} cols={1} />
          ) : !data || data.results.length === 0 ? (
            <EmptyState
              title="Salonlar topilmadi"
              description="Qidiruv, viloyat yoki holat filtrini o‘zgartirib qayta urinib ko‘ring."
            />
          ) : (
            <>
              <ul className="space-y-2">
                {data.results.map((s) => {
                  const regionName = uzRegionLabel(s.region);
                  return (
                    <SalonListRow
                      key={s.id}
                      s={s}
                      regionName={regionName}
                      onPatch={(body) => patchSalon.mutate({ id: s.id, body })}
                      patchPending={patchSalon.isPending}
                      onDelete={() => setDeleteTarget(s)}
                    />
                  );
                })}
              </ul>

              <div className="mt-8 border-t border-border/70 pt-6">
                <Pagination
                  page={data.page}
                  totalPages={data.total_pages}
                  count={data.count}
                  pageSize={PAGE_SIZE}
                  onPageChange={(p) =>
                    navigate({ search: (prev) => ({ ...prev, page: p }) })
                  }
                />
              </div>
            </>
          )}
        </main>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Salonni o'chirish"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" salonini va unga tegishli ma'lumotlarni o'chirishni tasdiqlaysizmi?`
            : ""
        }
        loading={removeSalon.isPending}
        onConfirm={() => deleteTarget && removeSalon.mutate(deleteTarget.id)}
      />
    </div>
  );
}

function SalonListRow({
  s,
  regionName,
  onPatch,
  patchPending,
  onDelete,
}: {
  s: AdminSalon;
  regionName: string;
  onPatch: (body: Parameters<typeof patchAdminSalon>[1]) => void;
  patchPending: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20 sm:flex-row sm:items-stretch">
      <Link
        to="/admin/salons/$salonId"
        params={{ salonId: s.id }}
        className="flex min-w-0 flex-1 flex-col gap-3 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:pr-3"
        title={`${s.name} — batafsil`}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:size-11"
          aria-hidden
        >
          <Store className="size-5 text-primary sm:size-[1.35rem]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            <h2 className="min-w-0 font-heading text-base font-semibold leading-snug text-foreground group-hover:text-primary">
              <span className="line-clamp-2 sm:line-clamp-1">{s.name}</span>
            </h2>
            <StatusBadge status={s.published ? "published" : "draft"} className="shrink-0" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {regionName || "Viloyat ko‘rsatilmagan"}
          </p>
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="line-clamp-2 sm:line-clamp-1" title={s.address || undefined}>
              {s.address || "Manzil ko‘rsatilmagan"}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5" title="Egasi">
              <User className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="font-medium text-foreground">
                {s.owner_name || s.owner_email || "Ega ko‘rsatilmagan"}
              </span>
            </span>
            {(s.phone || s.owner_phone) ? (
              <span className="inline-flex items-center gap-1.5 tabular-nums" title="Telefon">
                <Phone className="size-3.5 shrink-0 opacity-70" aria-hidden />
                {s.phone || s.owner_phone}
              </span>
            ) : null}
          </div>
        </div>

        {/* Metrikalar — bronlar, daromad, jamoa */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <InlineStat icon={CalendarClock} value={s.bookings_count} title="Bronlar soni" />
          <InlineStat
            icon={Wallet}
            value={formatAdminUzs(s.revenue_uzs)}
            title="Yakunlangan bronlar daromadi"
          />
          <InlineStat icon={Users} value={s.barbers_count} title="Sartaroshlar soni" />
          <InlineStat icon={MessageCircle} value={s.reviews_count} title="Sharhlar soni" />
          <InlineStat
            icon={Star}
            value={s.rating.toFixed(1)}
            title="O‘rtacha reyting"
          />
        </div>
      </Link>

      <div className="flex shrink-0 items-center justify-end gap-1 border-t border-border/60 bg-muted/20 px-2 py-2 sm:w-auto sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:px-2 sm:py-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 min-w-0 flex-1 px-2.5 text-xs font-medium sm:h-7 sm:flex-none sm:px-2"
          disabled={patchPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPatch({ published: !s.published });
          }}
        >
          {s.published ? "Yashirish" : "Chiqarish"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 sm:size-7"
              onClick={(e) => e.stopPropagation()}
              aria-label="Boshqa amallar"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={() => onPatch({ published: !s.published })}
              disabled={patchPending}
            >
              {s.published ? "Yashirish" : "Tasdiqlash"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 size-4" />
              O'chirish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function InlineStat({
  icon: Icon,
  value,
  title,
}: {
  icon: LucideIcon;
  value: string | number;
  title: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground"
      title={title}
    >
      <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
      <strong className="font-semibold text-foreground">{value}</strong>
    </span>
  );
}
