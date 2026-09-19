import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CloudSun, Package, Plus, Trash2, Users } from "lucide-react";
import {
  createAdminWeatherShieldProduct,
  deleteAdminWeatherShieldProduct,
  fetchAdminWeatherShieldActivity,
  fetchAdminWeatherShieldCategories,
  fetchAdminWeatherShieldProducts,
  fetchAdminWeatherShieldStats,
} from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/parvarish/ob-havo")({
  component: ObHavoPage,
});

function ObHavoPage() {
  const qc = useQueryClient();
  const [categoryKey, setCategoryKey] = useState<string>("all");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [kind, setKind] = useState("product");
  const [hair, setHair] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [formCat, setFormCat] = useState("");

  const stats = useQuery({
    queryKey: ["admin", "weather-shield", "stats"],
    queryFn: fetchAdminWeatherShieldStats,
  });
  const cats = useQuery({
    queryKey: ["admin", "weather-shield", "categories"],
    queryFn: fetchAdminWeatherShieldCategories,
  });
  const products = useQuery({
    queryKey: ["admin", "weather-shield", "products", categoryKey],
    queryFn: () =>
      fetchAdminWeatherShieldProducts(categoryKey === "all" ? undefined : categoryKey),
  });
  const activity = useQuery({
    queryKey: ["admin", "weather-shield", "activity"],
    queryFn: () => fetchAdminWeatherShieldActivity(40),
  });

  const createMut = useMutation({
    mutationFn: createAdminWeatherShieldProduct,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "weather-shield"] });
      setName("");
      setDesc("");
      setHair("");
      setImage(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminWeatherShieldProduct,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "weather-shield"] }),
  });

  const catOptions = cats.data ?? [];
  const activeFormCat = formCat || catOptions[0]?.key || "";

  const filteredLabel = useMemo(() => {
    if (categoryKey === "all") return "Barcha kategoriyalar";
    return catOptions.find((c) => c.key === categoryKey)?.title_uz || categoryKey;
  }, [categoryKey, catOptions]);

  if (stats.isLoading || cats.isLoading) {
    return <CardSkeleton className="h-48" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Ob-havo himoyasi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kategoriya bo‘yicha mahsulotlar, user faoliyati va rasmlar (DB)
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Kategoriyalar" value={stats.data?.categories_total ?? 0} icon={CloudSun} />
        <KPICard label="Mahsulotlar" value={stats.data?.products_total ?? 0} icon={Package} />
        <KPICard label="Nashr" value={stats.data?.products_published ?? 0} icon={Package} />
        <KPICard label="Bugun bajarildi" value={stats.data?.actions_today ?? 0} icon={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-heading text-base font-semibold">Yangi mahsulot</h2>
          <div className="space-y-2">
            <Label>Kategoriya</Label>
            <Select value={activeFormCat} onValueChange={setFormCat}>
              <SelectTrigger>
                <SelectValue placeholder="Tanlang" />
              </SelectTrigger>
              <SelectContent>
                {catOptions.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.title_uz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nomi</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="UV himoya sprey" />
          </div>
          <div className="space-y-2">
            <Label>Tavsif</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tur</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Mahsulot</SelectItem>
                  <SelectItem value="routine">Rutina</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Soch holati (ixtiyoriy)</Label>
              <Input
                value={hair}
                onChange={(e) => setHair(e.target.value)}
                placeholder="oily,dry,damaged"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rasm</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            disabled={!name.trim() || !activeFormCat || createMut.isPending}
            onClick={() =>
              createMut.mutate({
                name: name.trim(),
                category_key: activeFormCat,
                description_uz: desc.trim(),
                kind,
                hair_conditions: hair.trim(),
                image,
              })
            }
          >
            <Plus className="mr-1 size-4" />
            Qo‘shish
          </Button>
          {createMut.isError ? (
            <p className="text-sm text-destructive">{(createMut.error as Error).message}</p>
          ) : null}
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-base font-semibold">Kategoriyalar</h2>
          </div>
          <div className="space-y-2">
            {catOptions.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategoryKey(c.key)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  categoryKey === c.key
                    ? "border-foreground bg-muted"
                    : "border-border hover:bg-muted/60"
                }`}
              >
                <span className="font-medium">{c.title_uz}</span>
                <Badge variant="secondary">{c.products_count}</Badge>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCategoryKey("all")}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                categoryKey === "all" ? "border-foreground bg-muted" : "border-border"
              }`}
            >
              Barchasi
            </button>
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Mahsulotlar — {filteredLabel}</h2>
        </div>
        {products.isLoading ? (
          <CardSkeleton className="h-32" />
        ) : !products.data?.length ? (
          <EmptyState title="Mahsulot yo‘q" description="Yuqoridan kategoriya tanlab qo‘shing." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rasm</TableHead>
                  <TableHead>Nomi</TableHead>
                  <TableHead>Kategoriya</TableHead>
                  <TableHead>Tur</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.data.map((p) => (
                  <TableRow key={p.product_id}>
                    <TableCell>
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          className="size-12 rounded-lg object-contain bg-muted"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-12 rounded-lg bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name || p.title}</TableCell>
                    <TableCell>{p.category_title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.kind || p.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("O‘chirish?")) deleteMut.mutate(p.product_id);
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
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold">User faoliyati</h2>
        {activity.isLoading ? (
          <CardSkeleton className="h-32" />
        ) : !activity.data?.length ? (
          <EmptyState
            title="Hali faoliyat yo‘q"
            description="Userlar qadamlarni belgilaganda shu yerda ko‘rinadi."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Qadam</TableHead>
                  <TableHead>Kategoriya</TableHead>
                  <TableHead>Vaqt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {a.user_email || `#${a.user_id}`}
                    </TableCell>
                    <TableCell className="font-medium">{a.product_name}</TableCell>
                    <TableCell>{a.category_title || a.category_key || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.completed_at ? new Date(a.completed_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
