import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Trash2, MoreHorizontal } from "lucide-react";
import { fetchAdminBarbers, patchAdminBarber, deleteAdminBarber, PAGE_SIZE } from "@/lib/admin-api";
import { UZ_REGIONS } from "@/lib/uz-regions";
import type { AdminBarber } from "@/lib/admin-api";
import { FilterToolbar } from "@/components/admin/FilterToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/barbers")({
  component: BarbersPage,
});

function BarbersPage() {
  const search = Route.useSearch() as { q?: unknown; region?: unknown; page?: unknown };
  const q = typeof search.q === "string" ? search.q : "";
  const region = typeof search.region === "string" ? search.region : "";
  const pageRaw = typeof search.page === "number" ? search.page : Number(search.page);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<AdminBarber | null>(null);

  const barbersQ = useQuery({
    queryKey: ["admin", "barbers", { q, region, page }],
    queryFn: () => fetchAdminBarbers({ q, region, page }),
  });

  const patchBarber = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof patchAdminBarber>[1] }) =>
      patchAdminBarber(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Sartarosh yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBarber = useMutation({
    mutationFn: (id: string) => deleteAdminBarber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setDeleteTarget(null);
      toast.success("Sartarosh o'chirildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = barbersQ.data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Sartaroshlar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tarmoqdagi barcha sartaroshlar va ularning faolligi.
        </p>
      </div>

      <FilterToolbar
        search={q}
        onSearchChange={(v) =>
          navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, q: v, page: 1 }) })
        }
        region={region}
        onRegionChange={(v) =>
          navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, region: v, page: 1 }) })
        }
        searchPlaceholder="Sartarosh ismi yoki telefoni..."
      />

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {barbersQ.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !data || data.results.length === 0 ? (
          <EmptyState
            title="Sartaroshlar topilmadi"
            description="Filterlarni o'zgartirib qayta urinib ko'ring."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Sartarosh</th>
                    <th className="px-6 py-3 font-medium">Salon</th>
                    <th className="px-6 py-3 font-medium">Hudud</th>
                    <th className="px-6 py-3 font-medium">Reyting</th>
                    <th className="px-6 py-3 font-medium">Holat</th>
                    <th className="px-6 py-3 font-medium text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((b) => (
                    <tr key={b.id} className="hover:bg-background/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.avatar}
                            alt=""
                            className="size-9 rounded-full object-cover ring-1 ring-border"
                          />
                          <div>
                            <div className="font-medium text-foreground">{b.name}</div>
                            <div className="text-xs text-muted-foreground tabular-nums">
                              {b.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {b.salon_name ?? (
                          <span className="text-muted-foreground italic">Mustaqil</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={b.region || "__UNSET__"}
                          onValueChange={(v) =>
                            patchBarber.mutate({
                              id: b.id,
                              body: { region: v === "__UNSET__" ? "" : v },
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__UNSET__">Ko'rsatilmagan</SelectItem>
                            {UZ_REGIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Star className="size-3.5 fill-foreground" />
                          <span className="tabular-nums font-medium">{b.rating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({b.reviews_count})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={b.is_active}
                            onCheckedChange={(v) =>
                              patchBarber.mutate({ id: b.id, body: { is_active: v } })
                            }
                          />
                          <StatusBadge status={b.is_active ? "active" : "inactive"} />
                        </div>
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
                              className="text-destructive"
                              onClick={() => setDeleteTarget(b)}
                            >
                              <Trash2 className="size-4 mr-2" />
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
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
        title="Sartaroshni o'chirish"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" hisobi va u bilan bog'liq ma'lumotlar o'chiriladi. Bu amalni qaytarib bo'lmaydi.`
            : ""
        }
        loading={removeBarber.isPending}
        onConfirm={() => deleteTarget && removeBarber.mutate(deleteTarget.id)}
      />
    </div>
  );
}
