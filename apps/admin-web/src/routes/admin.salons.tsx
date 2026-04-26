import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, MoreHorizontal, MapPin, Star } from "lucide-react";
import { fetchAdminSalons, patchAdminSalon, deleteAdminSalon, PAGE_SIZE } from "@/lib/admin-api";
import { UZ_REGIONS, uzRegionLabel } from "@/lib/uz-regions";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/salons")({
  component: SalonsPage,
});

function SalonsPage() {
  const search = Route.useSearch() as {
    q?: unknown;
    region?: unknown;
    status?: unknown;
    page?: unknown;
  };
  const q = typeof search.q === "string" ? search.q : "";
  const region = typeof search.region === "string" ? search.region : "";
  const status = (
    search.status === "published" || search.status === "pending" || search.status === "all"
      ? search.status
      : "all"
  ) as "all" | "published" | "pending";
  const pageRaw = typeof search.page === "number" ? search.page : Number(search.page);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
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
  const STATUS_TABS: Array<{ key: typeof status; label: string }> = [
    { key: "all", label: "Hammasi" },
    { key: "published", label: "Chiqarilgan" },
    { key: "pending", label: "Tekshiruvda" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Salonlar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Hamkor sartaroshxonalarni boshqarish va tasdiqlash.
        </p>
      </div>

      <div className="space-y-3">
        <FilterToolbar
          search={q}
          onSearchChange={(v) =>
            navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, q: v, page: 1 }) })
          }
          region={region}
          onRegionChange={(v) =>
            navigate({
              search: (prev: Record<string, unknown>) => ({ ...prev, region: v, page: 1 }),
            })
          }
          searchPlaceholder="Salon nomi bo'yicha qidirish..."
        />

        {/* Status tabs */}
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() =>
                navigate({
                  search: (prev: Record<string, unknown>) => ({ ...prev, status: t.key, page: 1 }),
                })
              }
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                status === t.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {salonsQ.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !data || data.results.length === 0 ? (
          <EmptyState
            title="Salonlar topilmadi"
            description="Filterlarni o'zgartirib qayta urinib ko'ring."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Salon</th>
                    <th className="px-6 py-3 font-medium">Manzil</th>
                    <th className="px-6 py-3 font-medium text-right">Sartaroshlar</th>
                    <th className="px-6 py-3 font-medium">Reyting</th>
                    <th className="px-6 py-3 font-medium">Holat</th>
                    <th className="px-6 py-3 font-medium text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((s) => {
                    const regionName = uzRegionLabel(s.region);
                    return (
                      <tr key={s.id} className="hover:bg-background/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{regionName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <MapPin className="size-3.5" />
                            <span>{s.address}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-foreground">
                          {s.barbers_count}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Star className="size-3.5 fill-foreground" />
                            <span className="tabular-nums font-medium">{s.rating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={s.published ? "published" : "draft"} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  patchSalon.mutate({
                                    id: s.id,
                                    body: { published: !s.published },
                                  })
                                }
                              >
                                {s.published ? "Yashirish" : "Tasdiqlash"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget(s)}
                              >
                                <Trash2 className="size-4 mr-2" />
                                O'chirish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              totalPages={data.total_pages}
              count={data.count}
              pageSize={PAGE_SIZE}
              onPageChange={(p) =>
                navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, page: p }) })
              }
            />
          </>
        )}
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
