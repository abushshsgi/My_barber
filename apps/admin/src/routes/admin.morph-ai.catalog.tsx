import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  createMorphHairstyle,
  fetchMorphHairstyles,
  patchMorphHairstyle,
  type MorphHairstyle,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/morph-ai/catalog")({
  component: MorphCatalogPage,
});

type FormState = {
  style_id: string;
  slug: string;
  audience: string;
  category: string;
  title: string;
  title_uz: string;
  hair_length: string;
  image_path: string;
  description_uz: string;
  sort_order: string;
  is_published: boolean;
};

const emptyForm = (): FormState => ({
  style_id: "",
  slug: "",
  audience: "men",
  category: "barber",
  title: "",
  title_uz: "",
  hair_length: "medium",
  image_path: "",
  description_uz: "",
  sort_order: "0",
  is_published: true,
});

function MorphCatalogPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [audience, setAudience] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MorphHairstyle | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const list = useQuery({
    queryKey: ["admin", "morph-ai", "catalog", audience, q],
    queryFn: () =>
      fetchMorphHairstyles({
        audience: audience === "all" ? "" : audience,
        q: q.trim() || undefined,
      }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        slug: form.slug,
        audience: form.audience,
        category: form.category,
        title: form.title,
        title_uz: form.title_uz || form.title,
        hair_length: form.hair_length,
        image_path: form.image_path,
        description_uz: form.description_uz,
        sort_order: Number(form.sort_order) || 0,
        is_published: form.is_published,
      };
      if (editing) {
        return patchMorphHairstyle(editing.style_id, body);
      }
      return createMorphHairstyle({ ...body, style_id: form.style_id || undefined });
    },
    onSuccess: () => {
      toast.success(editing ? "Saqlandi" : "Qo'shildi");
      setOpen(false);
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["admin", "morph-ai", "catalog"] });
    },
    onError: (e: Error) => toast.error(e.message || "Xato"),
  });

  const rows = useMemo(() => list.data || [], [list.data]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (row: MorphHairstyle) => {
    setEditing(row);
    setForm({
      style_id: row.style_id,
      slug: row.slug,
      audience: row.audience,
      category: row.category,
      title: row.title,
      title_uz: row.title_uz,
      hair_length: row.hair_length,
      image_path: row.image_path,
      description_uz: row.description_uz,
      sort_order: String(row.sort_order),
      is_published: row.is_published,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Hairstyle katalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish, tartib va uslub meta — Explore / Morph AI katalogi
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Yangi uslub
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
        <Select value={audience} onValueChange={setAudience}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hammasi</SelectItem>
            <SelectItem value="men">Men</SelectItem>
            <SelectItem value="women">Women</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.isLoading ? (
        <CardSkeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState title="Katalog bo'sh" description="Uslub qo'shing yoki filtrni o'zgartiring." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uslub</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Uzunlik</TableHead>
                <TableHead className="text-right">Tartib</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.style_id}>
                  <TableCell>
                    <div className="font-medium">{row.title_uz || row.title}</div>
                    <div className="text-xs text-muted-foreground">{row.style_id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.audience}</Badge>
                  </TableCell>
                  <TableCell>{row.hair_length}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={row.is_published ? "default" : "outline"}>
                      {row.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? "Uslubni tahrirlash" : "Yangi uslub"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {!editing ? (
              <Input
                placeholder="style_id (ixtiyoriy)"
                value={form.style_id}
                onChange={(e) => setForm((p) => ({ ...p, style_id: e.target.value }))}
              />
            ) : null}
            <Input
              placeholder="slug"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
            />
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
            <Input
              placeholder="Title (UZ)"
              value={form.title_uz}
              onChange={(e) => setForm((p) => ({ ...p, title_uz: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={form.audience}
                onValueChange={(v) => setForm((p) => ({ ...p, audience: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="men">men</SelectItem>
                  <SelectItem value="women">women</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={form.hair_length}
                onValueChange={(v) => setForm((p) => ({ ...p, hair_length: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">short</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="long">long</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="image_path (/hairstyles/...)"
              value={form.image_path}
              onChange={(e) => setForm((p) => ({ ...p, image_path: e.target.value }))}
            />
            <Textarea
              rows={3}
              placeholder="Tavsif (UZ)"
              value={form.description_uz}
              onChange={(e) => setForm((p) => ({ ...p, description_uz: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="sort_order"
              value={form.sort_order}
              onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
            />
            <label className="flex items-center justify-between gap-3 text-sm">
              Published
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor
            </Button>
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
