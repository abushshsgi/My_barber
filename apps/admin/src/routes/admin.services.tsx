import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Trash2, Pencil, AlertCircle } from "lucide-react";
import {
  fetchServices,
  fetchCategories,
  createService,
  updateService,
  deleteService,
  type AdminService,
} from "@/lib/admin-api";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import {
  EditServiceDialog,
  type ServiceCreateFormValues,
  type ServiceFormValues,
} from "@/components/admin/edit-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/admin/services")({
  component: ServicesPage,
});

function ServicesPage() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<AdminService | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null);
  const [serviceQuery, setServiceQuery] = useState("");
  const deferredQ = useDeferredValue(serviceQuery.trim());
  const [typeFilter, setTypeFilter] = useState<"all" | "salon" | "independent">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const listParams = useMemo(
    () => ({
      q: deferredQ || undefined,
      type: typeFilter === "all" ? undefined : typeFilter,
      category: categoryFilter,
    }),
    [deferredQ, typeFilter, categoryFilter],
  );

  const servicesQ = useQuery({
    queryKey: ["admin", "services", listParams],
    queryFn: () => fetchServices(listParams),
  });
  const catsQ = useQuery({ queryKey: ["admin", "categories"], queryFn: () => fetchCategories() });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin", "services"] });

  const createMut = useMutation({
    mutationFn: (v: ServiceCreateFormValues) =>
      createService({
        type: v.service_type,
        name: v.name,
        price: v.price,
        duration_min: v.duration_min,
        is_active: v.is_active,
        category_ids: v.category_id ? [v.category_id] : [],
        salon_id: v.service_type === "salon" ? v.salon_id : undefined,
        barber_id: v.service_type === "independent" ? v.barber_id : undefined,
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success("Xizmat qo'shildi");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xizmat qo'shib bo'lmadi"),
  });
  const updateMut = useMutation({
    mutationFn: ({
      id,
      body,
      type,
    }: {
      id: string;
      body: ServiceFormValues;
      type: "salon" | "independent";
    }) =>
      updateService(id, {
        type,
        name: body.name,
        price: body.price,
        duration_min: body.duration_min,
        is_active: body.is_active,
        category_ids: body.category_id ? [body.category_id] : [],
      }),
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
      toast.success("Xizmat yangilandi");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Saqlab bo'lmadi"),
  });
  const deleteMut = useMutation({
    mutationFn: ({ id, type }: { id: string; type: "salon" | "independent" }) =>
      deleteService(id, type),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success("Xizmat o'chirildi");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "O'chirib bo'lmadi"),
  });

  const data = servicesQ.data ?? [];
  const cats = catsQ.data ?? [];
  const servicesError = servicesQ.isError
    ? (servicesQ.error as Error)?.message || "Xizmatlarni yuklab bo'lmadi"
    : null;
  const categoriesError = catsQ.isError
    ? (catsQ.error as Error)?.message || "Kategoriyalarni yuklab bo'lmadi"
    : null;
  const canCreateService = !catsQ.isLoading && !catsQ.isError && cats.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Xizmatlar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Barcha xizmatlar katalogi va narxlar.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={!canCreateService}
          title={!canCreateService ? "Yangi xizmat uchun kamida bitta kategoriya kerak" : undefined}
        >
          <Plus className="size-4 mr-1" /> Yangi
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Xizmat yoki salon nomi bo'yicha qidiruv…"
          value={serviceQuery}
          onChange={(e) => setServiceQuery(e.target.value)}
          className="max-w-md"
        />
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as "all" | "salon" | "independent")}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha turlar</SelectItem>
            <SelectItem value="salon">Salon</SelectItem>
            <SelectItem value="independent">Mustaqil</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          disabled={catsQ.isLoading || !!categoriesError || cats.length === 0}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Kategoriya" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha kategoriyalar</SelectItem>
            {cats.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categoriesError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Kategoriyalar yuklanmadi</AlertTitle>
          <AlertDescription>{categoriesError}</AlertDescription>
        </Alert>
      ) : !catsQ.isLoading && cats.length === 0 ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Kategoriya topilmadi</AlertTitle>
          <AlertDescription>
            Yangi xizmat qo'shishdan oldin kamida bitta kategoriya yarating.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {servicesQ.isLoading ? (
          <TableSkeleton rows={6} cols={9} />
        ) : servicesError ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Xizmatlar yuklanmadi</AlertTitle>
              <AlertDescription>{servicesError}</AlertDescription>
            </Alert>
          </div>
        ) : data.length === 0 ? (
          <EmptyState title="Xizmatlar topilmadi" description="Filtrni o'zgartiring yoki yangi xizmat qo'shing." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Tur</th>
                  <th className="px-6 py-3 font-medium">Xizmat</th>
                  <th className="px-6 py-3 font-medium">Kategoriya</th>
                  <th className="px-6 py-3 font-medium">Salon / Barber</th>
                  <th className="px-6 py-3 font-medium text-right">Narx</th>
                  <th className="px-6 py-3 font-medium text-right">Davomiyligi</th>
                  <th className="px-6 py-3 font-medium text-right">Bronlar</th>
                  <th className="px-6 py-3 font-medium">Holat</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((s) => (
                  <tr key={`${s.type}-${s.id}`} className="hover:bg-background/50">
                    <td className="px-6 py-4 text-muted-foreground">
                      {s.type === "salon" ? "Salon" : "Mustaqil"}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{s.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{s.category_names}</td>
                    <td className="px-6 py-4 text-muted-foreground max-w-[220px] truncate">
                      {s.type === "salon"
                        ? s.salon_name || "—"
                        : s.barber_name || (s.barber_id ? `ID ${s.barber_id}` : "—")}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-foreground font-medium">
                      {s.price.toLocaleString()} so'm
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                      {s.duration_min} min
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                      {s.bookings_count}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={s.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditTarget(s)}>
                            <Pencil className="size-4 mr-2" /> Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="size-4 mr-2" /> O'chirish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditServiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={cats}
        loading={createMut.isPending}
        onSave={(v) => createMut.mutate(v as ServiceCreateFormValues)}
        mode="create"
      />
      <EditServiceDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        categories={cats}
        defaultValues={
          editTarget
            ? {
                name: editTarget.name,
                category_id: editTarget.category_ids[0] ?? "",
                price: editTarget.price,
                duration_min: editTarget.duration_min,
                is_active: editTarget.is_active,
              }
            : undefined
        }
        loading={updateMut.isPending}
        onSave={(v) =>
          editTarget && updateMut.mutate({ id: editTarget.id, body: v as ServiceFormValues, type: editTarget.type })
        }
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Xizmatni o'chirish"
        description={deleteTarget ? `"${deleteTarget.name}" xizmati o'chiriladi.` : ""}
        loading={deleteMut.isPending}
        onConfirm={() =>
          deleteTarget && deleteMut.mutate({ id: deleteTarget.id, type: deleteTarget.type })
        }
      />
    </div>
  );
}
