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
  MapPin,
  MoreHorizontal,
  Star,
  Trash2,
  Users,
  MessageCircle,
  Store,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAdminSalons, patchAdminSalon, deleteAdminSalon, PAGE_SIZE } from "@/lib/admin-api";
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
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gradient-to-b from-muted/50 via-background to-background">
      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row lg:items-stretch">
        {/* Chap: filtr va navigatsiya */}
        <aside className="shrink-0 border-b border-border bg-card/90 px-4 py-5 shadow-sm lg:w-[min(100%,320px)] lg:border-b-0 lg:border-r lg:shadow-none">
          <div className="mx-auto max-w-lg lg:mx-0">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Store className="size-5" aria-hidden />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                  Salonlar
                </h1>
                <p className="text-xs text-muted-foreground">
                  Hamkor sartaroshxonalar katalogi
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Qatorni bosing — batafsil sahifa. Sartarosh havolalari «Jamoa» ichida; «Orqaga» bilan
              ro‘yxatga qaytadi.
            </p>

            <div className="mt-6 space-y-5">
              <FilterToolbar
                className="flex-col !items-stretch gap-3"
                search={q}
                onSearchChange={(v) =>
                  navigate({ search: (prev) => ({ ...prev, q: v, page: 1 }) })
                }
                region={region}
                onRegionChange={(v) =>
                  navigate({ search: (prev) => ({ ...prev, region: v, page: 1 }) })
                }
                searchPlaceholder="Salon nomi bo'yicha qidirish..."
              />

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Chop etish holati
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {STATUS_TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() =>
                        navigate({ search: (prev) => ({ ...prev, status: t.key, page: 1 }) })
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all",
                        status === t.key
                          ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                          : "border-transparent bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      {t.label}
                      {status === t.key ? (
                        <ChevronRight className="size-4 shrink-0 text-primary" aria-hidden />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* O‘ng: natijalar */}
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {salonsQ.isLoading ? (
            <TableSkeleton rows={8} cols={1} />
          ) : !data || data.results.length === 0 ? (
            <EmptyState
              title="Salonlar topilmadi"
              description="Qidiruv, viloyat yoki holat filtrini o‘zgartirib qayta urinib ko‘ring."
            />
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Natija
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
                    {data.count}{" "}
                    <span className="text-base font-normal text-muted-foreground">ta salon</span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sahifa {data.page} / {data.total_pages}
                </p>
              </div>

              <ul className="space-y-2.5">
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

              <div className="mt-8 border-t border-border/60 pt-6">
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
    <li className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-[box-shadow,transform] hover:border-primary/25 hover:shadow-md sm:flex-row sm:items-stretch">
      <Link
        to="/admin/salons/$salonId"
        params={{ salonId: s.id }}
        className="flex min-w-0 flex-1 gap-4 p-4 sm:gap-5 sm:p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        title={`${s.name} — batafsil`}
      >
        <div
          className="hidden size-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 sm:flex sm:items-center sm:justify-center"
          aria-hidden
        >
          <Store className="size-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-heading text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-lg">
                <span className="inline-flex items-center gap-2">
                  {s.name}
                  <ChevronRight className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 sm:inline" />
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {regionName || "Viloyat ko‘rsatilmagan"}
              </p>
            </div>
            <StatusBadge status={s.published ? "published" : "draft"} className="shrink-0" />
          </div>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-2" title={s.address || undefined}>
              {s.address || "Manzil ko‘rsatilmagan"}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-4 border-t border-dashed border-border/80 pt-3 sm:hidden">
            <MetricMini icon={Users} label="Sartarosh" value={s.barbers_count} />
            <MetricMini icon={MessageCircle} label="Sharh" value={s.reviews_count} />
            <MetricMini icon={Star} label="Reyting" value={s.rating.toFixed(1)} />
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end justify-center gap-3 border-l border-border/60 pl-5 sm:flex">
          <MetricChip icon={Users} label="Sartarosh" value={s.barbers_count} />
          <MetricChip icon={MessageCircle} label="Sharh" value={s.reviews_count} />
          <MetricChip icon={Star} label="Reyting" value={s.rating.toFixed(1)} />
        </div>
      </Link>
      <div className="flex items-center justify-end gap-1.5 border-t border-border/80 bg-muted/25 px-3 py-2 sm:w-36 sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:px-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 flex-1 text-xs sm:flex-none sm:w-full"
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
              className="size-8 shrink-0 sm:size-8"
              onClick={(e) => e.stopPropagation()}
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

function MetricChip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-right">
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      <div>
        <div className="text-sm font-semibold tabular-nums leading-none">{value}</div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

function MetricMini({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
