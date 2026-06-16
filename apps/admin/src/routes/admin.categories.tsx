import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/admin/EmptyState";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✂️");

  const catsQ = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
  });

  const addCat = useMutation({
    mutationFn: () => createCategory({ name: name.trim(), icon: icon.trim() || "✂️" }),
    onSuccess: () => {
      setName("");
      void qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Kategoriya qo'shildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchCat = useMutation({
    mutationFn: ({ id, order }: { id: string; order: number }) => updateCategory(id, { order }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });

  const removeCat = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("O'chirildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = catsQ.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Kategoriyalar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Xizmat katalogi kategoriyalari.</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addCat.mutate();
        }}
      >
        <div className="min-w-[140px] flex-1">
          <label className="text-xs text-muted-foreground">Nomi</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Soch" />
        </div>
        <div className="w-24">
          <label className="text-xs text-muted-foreground">Icon</label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <Button type="submit" disabled={addCat.isPending || !name.trim()}>
          <Plus className="mr-1 size-4" />
          Qo'shish
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {catsQ.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
        ) : rows.length === 0 ? (
          <EmptyState title="Kategoriyalar yo'q" description="Yuqoridan yangi kategoriya qo'shing." />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{c.icon || "📁"}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.services_count} xizmat</p>
                </div>
                <Input
                  type="number"
                  className="h-8 w-20"
                  defaultValue={c.order}
                  onBlur={(e) => {
                    const order = Number(e.target.value);
                    if (Number.isFinite(order) && order !== c.order) {
                      patchCat.mutate({ id: c.id, order });
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCat.mutate(c.id)}
                  aria-label="O'chirish"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
