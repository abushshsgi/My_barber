import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createAdminCareProduct,
  deleteAdminCareProduct,
  fetchAdminCareProducts,
  patchAdminCareProduct,
  type AdminCareProduct,
  type CareProductCategory,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/parvarish/tarkib")({
  component: ParvarishTarkibPage,
});

const CATEGORIES: { value: CareProductCategory; label: string }[] = [
  { value: "shampoo", label: "Shampun" },
  { value: "balsam", label: "Balzam" },
  { value: "mask", label: "Maska" },
  { value: "oil", label: "Yog'" },
  { value: "spray", label: "Sprey" },
  { value: "other", label: "Boshqa" },
];

const HAIR_TAGS: { value: string; label: string }[] = [
  { value: "oily", label: "Yog'li" },
  { value: "dry", label: "Quruq" },
  { value: "normal", label: "Normal" },
  { value: "damaged", label: "Shikastlangan" },
  { value: "straight", label: "To'g'ri" },
  { value: "wavy", label: "To'lqinsimon" },
  { value: "curly", label: "Jingalak" },
  { value: "natural", label: "Tabiiy" },
  { value: "colored", label: "Bo'yalgan" },
  { value: "bleached", label: "Ochilgan" },
];

type FormState = {
  name: string;
  brand: string;
  category: CareProductCategory;
  ingredients_text: string;
  usage_uz: string;
  purpose_uz: string;
  suitable_for: string[];
  not_suitable_for: string[];
  pros_uz: string;
  cons_uz: string;
  warnings_uz: string;
  is_published: boolean;
  sort_order: string;
  image: File | null;
};

const emptyForm = (): FormState => ({
  name: "",
  brand: "",
  category: "shampoo",
  ingredients_text: "",
  usage_uz: "",
  purpose_uz: "",
  suitable_for: [],
  not_suitable_for: [],
  pros_uz: "",
  cons_uz: "",
  warnings_uz: "",
  is_published: true,
  sort_order: "0",
  image: null,
});

function toggleTag(list: string[], tag: string): string[] {
  return list.includes(tag) ? list.filter((x) => x !== tag) : [...list, tag];
}

function ParvarishTarkibPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCareProduct | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const list = useQuery({
    queryKey: ["admin", "parvarish", "products", category, q],
    queryFn: () =>
      fetchAdminCareProducts({
        category: category === "all" ? "" : category,
        q: q.trim() || undefined,
      }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        ingredients_text: form.ingredients_text,
        usage_uz: form.usage_uz,
        purpose_uz: form.purpose_uz,
        suitable_for: form.suitable_for,
        not_suitable_for: form.not_suitable_for,
        pros_uz: form.pros_uz,
        cons_uz: form.cons_uz,
        warnings_uz: form.warnings_uz,
        is_published: form.is_published,
        sort_order: Number(form.sort_order) || 0,
        image: form.image,
      };
      if (!body.name) throw new Error("Mahsulot nomi kerak");
      if (editing) return patchAdminCareProduct(editing.id, body);
      return createAdminCareProduct(body);
    },
    onSuccess: () => {
      toast.success(editing ? "Saqlandi" : "Qo'shildi");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
      void qc.invalidateQueries({ queryKey: ["admin", "parvarish"] });
    },
    onError: (e: Error) => toast.error(e.message || "Xato"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminCareProduct(id),
    onSuccess: () => {
      toast.success("O'chirildi");
      void qc.invalidateQueries({ queryKey: ["admin", "parvarish"] });
    },
    onError: (e: Error) => toast.error(e.message || "O'chirilmadi"),
  });

  const rows = useMemo(() => list.data || [], [list.data]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (row: AdminCareProduct) => {
    setEditing(row);
    setForm({
      name: row.name,
      brand: row.brand || "",
      category: (row.category as CareProductCategory) || "shampoo",
      ingredients_text: row.ingredients_text || "",
      usage_uz: row.usage_uz || "",
      purpose_uz: row.purpose_uz || "",
      suitable_for: row.suitable_for || [],
      not_suitable_for: row.not_suitable_for || [],
      pros_uz: row.pros_uz || "",
      cons_uz: row.cons_uz || "",
      warnings_uz: row.warnings_uz || "",
      is_published: row.is_published,
      sort_order: String(row.sort_order ?? 0),
      image: null,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Tarkib katalogi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shampun, balzam va boshqa soch vositalari — userlarga ko'rinadi
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Yangi mahsulot
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Qidiruv..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hammasi</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.isLoading ? (
        <CardSkeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState title="Katalog bo'sh" description="Mahsulot qo'shing yoki filtrni o'zgartiring." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mahsulot</TableHead>
                <TableHead>Tur</TableHead>
                <TableHead>Kimlarga</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {row.image_url ? (
                        <img src={row.image_url} alt="" className="size-10 rounded-lg object-cover" />
                      ) : null}
                      <div>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.brand || row.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CATEGORIES.find((c) => c.value === row.category)?.label || row.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {(row.suitable_for || []).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.is_published ? "default" : "outline"}>
                      {row.is_published ? "Nashr" : "Qoralama"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("O'chirilsinmi?")) remove.mutate(row.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nomi</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Brend</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Kategoriya</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v as CareProductCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Rasm</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Tarkib (INCI)</Label>
              <Textarea
                rows={3}
                value={form.ingredients_text}
                onChange={(e) => setForm((p) => ({ ...p, ingredients_text: e.target.value }))}
                placeholder="Aqua, Glycerin, ..."
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Qo'llanish</Label>
              <Textarea
                rows={2}
                value={form.usage_uz}
                onChange={(e) => setForm((p) => ({ ...p, usage_uz: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Nima uchun</Label>
              <Textarea
                rows={2}
                value={form.purpose_uz}
                onChange={(e) => setForm((p) => ({ ...p, purpose_uz: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Kimlarga mos</Label>
              <div className="flex flex-wrap gap-2">
                {HAIR_TAGS.map((tag) => (
                  <label key={tag.value} className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={form.suitable_for.includes(tag.value)}
                      onCheckedChange={() =>
                        setForm((p) => ({ ...p, suitable_for: toggleTag(p.suitable_for, tag.value) }))
                      }
                    />
                    {tag.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Kimlarga mos emas</Label>
              <div className="flex flex-wrap gap-2">
                {HAIR_TAGS.map((tag) => (
                  <label key={`n-${tag.value}`} className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={form.not_suitable_for.includes(tag.value)}
                      onCheckedChange={() =>
                        setForm((p) => ({
                          ...p,
                          not_suitable_for: toggleTag(p.not_suitable_for, tag.value),
                        }))
                      }
                    />
                    {tag.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Yaxshi tomonlari</Label>
              <Textarea
                rows={2}
                value={form.pros_uz}
                onChange={(e) => setForm((p) => ({ ...p, pros_uz: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Yomon tomonlari</Label>
              <Textarea
                rows={2}
                value={form.cons_uz}
                onChange={(e) => setForm((p) => ({ ...p, cons_uz: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Ogohlantirish</Label>
              <Textarea
                rows={2}
                value={form.warnings_uz}
                onChange={(e) => setForm((p) => ({ ...p, warnings_uz: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label>Nashr qilish</Label>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Tartib</Label>
              <Input
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor
            </Button>
            <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
