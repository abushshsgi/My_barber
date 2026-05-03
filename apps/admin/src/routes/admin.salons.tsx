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
import { MapPin, MoreHorizontal, Star, Trash2, Users, MessageCircle } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Salonlar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-xl">
          Hamkor sartaroshxonalar: qidiruv, viloyat va chop etish holati. Kartani bosing — batafsil
          ma’lumot va jamoa havolalari.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-4 sm:p-5 shadow-sm space-y-4">
        <FilterToolbar
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
        <Separator />
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Chop etish holati</p>
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-background p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() =>
                  navigate({ search: (prev) => ({ ...prev, status: t.key, page: 1 }) })
                }
                className={cn(
                  "px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                  status === t.key
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {salonsQ.isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : !data || data.results.length === 0 ? (
        <EmptyState
          title="Salonlar topilmadi"
          description="Qidiruv, viloyat yoki holat filtrini o‘zgartirib qayta urinib ko‘ring."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.results.map((s) => {
              const regionName = uzRegionLabel(s.region);
              return (
                <CardSalon
                  key={s.id}
                  s={s}
                  regionName={regionName}
                  onPatch={(body) => patchSalon.mutate({ id: s.id, body })}
                  patchPending={patchSalon.isPending}
                  onDelete={() => setDeleteTarget(s)}
                />
              );
            })}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            count={data.count}
            pageSize={PAGE_SIZE}
            onPageChange={(p) =>
              navigate({ search: (prev) => ({ ...prev, page: p }) })
            }
          />
        </>
      )}

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

function CardSalon({
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
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-shadow hover:shadow-md hover:border-foreground/15">
      <Link
        to="/admin/salons/$salonId"
        params={{ salonId: s.id }}
        className="flex flex-1 flex-col p-4 sm:p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold text-foreground leading-snug group-hover:underline">
              {s.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{regionName || "Viloyat ko‘rsatilmagan"}</p>
          </div>
          <StatusBadge status={s.published ? "published" : "draft"} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground line-clamp-2 flex items-start gap-1.5">
          <MapPin className="size-3.5 shrink-0 mt-0.5" />
          <span>{s.address || "—"}</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Users className="size-3.5" />
            </div>
            <div className="font-heading text-lg font-semibold tabular-nums">{s.barbers_count}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sartarosh</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <MessageCircle className="size-3.5" />
            </div>
            <div className="font-heading text-lg font-semibold tabular-nums">{s.reviews_count}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sharh</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Star className="size-3.5" />
            </div>
            <div className="font-heading text-lg font-semibold tabular-nums">{s.rating.toFixed(1)}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Reyting</div>
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-3 py-2.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
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
                className="size-8"
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
                <Trash2 className="size-4 mr-2" />
                O'chirish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
