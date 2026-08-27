import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  adminCareDemoAction,
  createAdminCareProduct,
  deleteAdminCareProduct,
  fetchAdminCareProducts,
  patchAdminCareProduct,
  type AdminCareProduct,
  type CareProductCategory,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

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
  const [editing, setEditing] = useState<AdminCareProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const editorOpen = creating || editing != null;

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
      closeEditor();
      void qc.invalidateQueries({ queryKey: ["admin", "parvarish"] });
    },
    onError: (e: Error) => toast.error(e.message || "Xato"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminCareProduct(id),
    onSuccess: () => {
      toast.success("O'chirildi");
      closeEditor();
      void qc.invalidateQueries({ queryKey: ["admin", "parvarish"] });
    },
    onError: (e: Error) => toast.error(e.message || "O'chirilmadi"),
  });

  const demoAction = useMutation({
    mutationFn: (action: "seed" | "purge") => adminCareDemoAction(action),
    onSuccess: (data) => {
      toast.success(data.message);
      void qc.invalidateQueries({ queryKey: ["admin", "parvarish"] });
    },
    onError: (e: Error) => toast.error(e.message || "Xato yuz berdi"),
  });

  const rows = useMemo(() => list.data || [], [list.data]);

  const closeEditor = () => {
    setCreating(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm(emptyForm());
  };

  const openEdit = (row: AdminCareProduct) => {
    setCreating(false);
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
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Parvarish / Tarkib
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
            Mahsulotlar
          </h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Katalog kartochkalari — tahrirlash o‘ng paneldan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => demoAction.mutate("seed")}
            disabled={demoAction.isPending}
            className="rounded-full border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
          >
            <Sparkles className="size-3.5" />
            20 ta Demo qo'shish
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => demoAction.mutate("purge")}
            disabled={demoAction.isPending}
            className="rounded-full border-destructive/25 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            Demolarni tozalash
          </Button>
          <Button type="button" onClick={openCreate} className="rounded-full px-4">
            <Plus className="size-4" />
            Yangi
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="rounded-full pl-9"
            placeholder="Qidiruv..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={category === "all"} onClick={() => setCategory("all")} label="Hammasi" />
          {CATEGORIES.map((c) => (
            <FilterPill
              key={c.value}
              active={category === c.value}
              onClick={() => setCategory(c.value)}
              label={c.label}
            />
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-5",
          editorOpen ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]" : "grid-cols-1",
        )}
      >
        <div>
          {list.isLoading ? (
            <CardSkeleton className="h-64" />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Katalog bo'sh"
              description="Yangi mahsulot qo'shing yoki filtrni o'zgartiring."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => {
                const active = editing?.id === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => openEdit(row)}
                    className={cn(
                      "group overflow-hidden rounded-2xl border text-left transition-colors",
                      active
                        ? "border-foreground bg-card shadow-sm"
                        : "border-border bg-card/60 hover:border-foreground/30",
                    )}
                  >
                    <div className="relative aspect-[5/3] bg-muted">
                      {row.image_url ? (
                        <img
                          src={row.image_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-muted-foreground">
                          <ImagePlus className="size-6 opacity-40" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1">
                        <Badge variant="secondary" className="bg-background/90 backdrop-blur">
                          {CATEGORIES.find((c) => c.value === row.category)?.label || row.category}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant={row.is_published ? "default" : "outline"}>
                          {row.is_published ? "Nashr" : "Qoralama"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.brand || "Brend yo‘q"}
                          </p>
                        </div>
                        <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {row.purpose_uz || row.usage_uz || "Tavsif yo‘q"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {editorOpen ? (
          <aside className="sticky top-20 h-fit rounded-2xl border border-border bg-card p-4 shadow-sm lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {editing ? "Tahrirlash" : "Yangi yozuv"}
                </p>
                <h2 className="font-heading text-lg font-semibold">
                  {editing ? editing.name : "Mahsulot"}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeEditor}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nomi">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </Field>
                <Field label="Brend">
                  <Input
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Kategoriya">
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, category: v as CareProductCategory }))
                    }
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
                </Field>
                <Field label="Rasm">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))
                    }
                  />
                </Field>
              </div>

              <Field label="Tarkib (INCI)">
                <Textarea
                  rows={3}
                  value={form.ingredients_text}
                  onChange={(e) => setForm((p) => ({ ...p, ingredients_text: e.target.value }))}
                  placeholder="Aqua, Glycerin, ..."
                />
              </Field>

              <div className="grid gap-3">
                <Field label="Qo'llanish">
                  <Textarea
                    rows={2}
                    value={form.usage_uz}
                    onChange={(e) => setForm((p) => ({ ...p, usage_uz: e.target.value }))}
                  />
                </Field>
                <Field label="Nima uchun">
                  <Textarea
                    rows={2}
                    value={form.purpose_uz}
                    onChange={(e) => setForm((p) => ({ ...p, purpose_uz: e.target.value }))}
                  />
                </Field>
              </div>

              <TagGroup
                label="Kimlarga mos"
                selected={form.suitable_for}
                onToggle={(tag) =>
                  setForm((p) => ({ ...p, suitable_for: toggleTag(p.suitable_for, tag) }))
                }
              />
              <TagGroup
                label="Kimlarga mos emas"
                selected={form.not_suitable_for}
                onToggle={(tag) =>
                  setForm((p) => ({
                    ...p,
                    not_suitable_for: toggleTag(p.not_suitable_for, tag),
                  }))
                }
              />

              <div className="grid gap-3">
                <Field label="Yaxshi tomonlari">
                  <Textarea
                    rows={2}
                    value={form.pros_uz}
                    onChange={(e) => setForm((p) => ({ ...p, pros_uz: e.target.value }))}
                  />
                </Field>
                <Field label="Yomon tomonlari">
                  <Textarea
                    rows={2}
                    value={form.cons_uz}
                    onChange={(e) => setForm((p) => ({ ...p, cons_uz: e.target.value }))}
                  />
                </Field>
                <Field label="Ogohlantirish">
                  <Textarea
                    rows={2}
                    value={form.warnings_uz}
                    onChange={(e) => setForm((p) => ({ ...p, warnings_uz: e.target.value }))}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <Label>Nashr qilish</Label>
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))}
                />
              </div>

              <Field label="Tartib">
                <Input
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
                />
              </Field>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  className="flex-1 rounded-full"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                >
                  Saqlash
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={closeEditor}>
                  Bekor
                </Button>
                {editing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full text-destructive"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm("O'chirilsinmi?")) remove.mutate(editing.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-3.5 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function TagGroup({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {HAIR_TAGS.map((tag) => {
          const on = selected.includes(tag.value);
          return (
            <label
              key={`${label}-${tag.value}`}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                on ? "border-foreground bg-foreground/5" : "border-border text-muted-foreground",
              )}
            >
              <Checkbox
                checked={on}
                onCheckedChange={() => onToggle(tag.value)}
                className="size-3.5"
              />
              {tag.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
