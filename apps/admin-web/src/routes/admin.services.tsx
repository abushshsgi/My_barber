import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import {
  fetchServices,
  fetchCategories,
  createService,
  updateService,
  deleteService,
  type AdminService,
} from "@/lib/mock-api-extra";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { EditServiceDialog } from "@/components/admin/edit-dialogs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/services")({
  component: ServicesPage,
});

function ServicesPage() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<AdminService | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null);

  const servicesQ = useQuery({ queryKey: ["admin", "services"], queryFn: () => fetchServices() });
  const catsQ = useQuery({ queryKey: ["admin", "categories"], queryFn: () => fetchCategories() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "services"] });

  const createMut = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      toast.success("Xizmat qo'shildi");
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminService> }) =>
      updateService(id, body),
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
      toast.success("Xizmat yangilandi");
    },
  });
  const deleteMut = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success("Xizmat o'chirildi");
    },
  });

  const data = servicesQ.data ?? [];
  const cats = catsQ.data ?? [];

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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-1" /> Yangi
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {servicesQ.isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : data.length === 0 ? (
          <EmptyState title="Xizmatlar topilmadi" description="Yangi xizmat qo'shing." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Xizmat</th>
                  <th className="px-6 py-3 font-medium">Kategoriya</th>
                  <th className="px-6 py-3 font-medium text-right">Narx</th>
                  <th className="px-6 py-3 font-medium text-right">Davomiyligi</th>
                  <th className="px-6 py-3 font-medium text-right">Bronlar</th>
                  <th className="px-6 py-3 font-medium">Holat</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((s) => (
                  <tr key={s.id} className="hover:bg-background/50">
                    <td className="px-6 py-4 font-medium text-foreground">{s.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{s.category_name}</td>
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
        onSave={(v) => createMut.mutate(v)}
        mode="create"
      />
      <EditServiceDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        categories={cats}
        defaultValues={editTarget ?? undefined}
        loading={updateMut.isPending}
        onSave={(v) => editTarget && updateMut.mutate({ id: editTarget.id, body: v })}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Xizmatni o'chirish"
        description={deleteTarget ? `"${deleteTarget.name}" xizmati o'chiriladi.` : ""}
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
}
