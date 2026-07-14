import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fetchAdminUsers, patchAdminUser, PAGE_SIZE } from "@/lib/admin-api";
import { uzRegionLabel } from "@/lib/uz-regions";
import { FilterToolbar } from "@/components/admin/FilterToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/users")({
  component: UsersRoute,
});

function UsersRoute() {
  const { pathname } = useLocation();
  if (pathname !== "/admin/users") {
    return <Outlet />;
  }
  return <UsersPage />;
}

function UsersPage() {
  const search = Route.useSearch() as { q?: unknown; region?: unknown; page?: unknown };
  const q = typeof search.q === "string" ? search.q : "";
  const region = typeof search.region === "string" ? search.region : "";
  const pageRaw = typeof search.page === "number" ? search.page : Number(search.page);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const usersQ = useQuery({
    queryKey: ["admin", "users", { q, region, page }],
    queryFn: () => fetchAdminUsers({ q, region, page }),
  });

  const patchUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof patchAdminUser>[1] }) =>
      patchAdminUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Mijoz yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = usersQ.data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Mijozlar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Har bir mijozning telefoni, hududi, bronlari va boshqa ma&apos;lumotlari. Statistika uchun{" "}
          <Link to="/admin/statistics/users" className="underline underline-offset-2 hover:text-foreground">
            Statistikalar → Mijozlar
          </Link>{" "}
          sahifasiga o&apos;ting.
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
        searchPlaceholder="Ism, telefon yoki email bo'yicha qidirish..."
      />

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {usersQ.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !data || data.results.length === 0 ? (
          <EmptyState
            title="Mijozlar topilmadi"
            description="Filterlarni o'zgartirib qayta urinib ko'ring."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Mijoz</th>
                    <th className="px-6 py-3 font-medium">Telefon</th>
                    <th className="px-6 py-3 font-medium">Hudud</th>
                    <th className="px-6 py-3 font-medium text-right">Bronlar</th>
                    <th className="px-6 py-3 font-medium">Ro&apos;yxatdan o&apos;tdi</th>
                    <th className="px-6 py-3 font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((u) => (
                    <tr key={u.id} className="hover:bg-background/50">
                      <td className="px-6 py-4">
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: u.id }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {u.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {u.displayEmail || "Email qo'shilmagan"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-foreground tabular-nums">{u.phone}</td>
                      <td className="px-6 py-4 text-foreground">
                        {u.regionLabel || uzRegionLabel(u.region)}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-foreground">
                        {u.bookings_count}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground tabular-nums">
                        {format(new Date(u.created_at), "dd MMM yyyy")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={u.is_active}
                            onCheckedChange={(v) =>
                              patchUser.mutate({ id: u.id, body: { is_active: v } })
                            }
                          />
                          <StatusBadge status={u.is_active ? "active" : "inactive"} />
                        </div>
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
    </div>
  );
}
