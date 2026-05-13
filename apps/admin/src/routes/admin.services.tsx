import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { API_BASE } from "@/lib/api";
import {
  createService,
  deleteService,
  fetchCategories,
  fetchServices,
  type AdminService,
  updateService,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/services")({
  component: ServicesPage,
});

type ServiceEditorValues = {
  name: string;
  description: string;
  image_url: string;
  duration_minutes: string;
  sort_order: string;
  is_active: boolean;
  category_id: string;
};

const FALLBACK_SERVICE_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 520'%3E%3Crect width='800' height='520' rx='36' fill='%23111827'/%3E%3Ccircle cx='620' cy='120' r='120' fill='%232563eb' fill-opacity='0.25'/%3E%3Ccircle cx='700' cy='410' r='100' fill='%23ec4899' fill-opacity='0.18'/%3E%3Ctext x='72' y='274' font-family='Arial,sans-serif' font-size='56' font-weight='700' fill='white'%3EXizmat%3C/text%3E%3Ctext x='72' y='328' font-family='Arial,sans-serif' font-size='24' fill='rgba(255,255,255,0.8)'%3EMyBarber katalog%3C/text%3E%3C/svg%3E";

function serviceImageSrc(path: string): string {
  const value = path.trim();
  if (!value) return FALLBACK_SERVICE_IMAGE;
  if (value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE}${normalized}`;
}

function toEditorValues(
  service: AdminService | null,
  firstCategoryId: string,
): ServiceEditorValues {
  if (!service) {
    return {
      name: "",
      description: "",
      image_url: "",
      duration_minutes: "30",
      sort_order: "0",
      is_active: true,
      category_id: firstCategoryId,
    };
  }
  return {
    name: service.name,
    description: service.description,
    image_url: service.image_url,
    duration_minutes: String(service.duration_minutes || 30),
    sort_order: String(service.sort_order || 0),
    is_active: service.is_active,
    category_id: service.category_ids[0] ?? firstCategoryId,
  };
}

function ServiceEditorDialog({
  open,
  onOpenChange,
  categories,
  initialService,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  categories: Array<{ id: string; name: string; icon: string }>;
  initialService: AdminService | null;
  loading: boolean;
  onSubmit: (values: ServiceEditorValues) => void;
}) {
  const firstCategoryId = categories[0]?.id ?? "";
  const [values, setValues] = useState<ServiceEditorValues>(() =>
    toEditorValues(initialService, firstCategoryId),
  );

  useEffect(() => {
    if (!open) return;
    setValues(toEditorValues(initialService, firstCategoryId));
  }, [open, initialService, firstCategoryId]);

  const mode = initialService ? "edit" : "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {mode === "create" ? "Yangi katalog xizmati" : "Katalog xizmatini tahrirlash"}
          </DialogTitle>
          <DialogDescription>
            Admin bu yerda nom, rasm, davomiylik va kategoriyani boshqaradi. Barberlar keyin shu katalogdan
            tanlaydi va o&apos;z narxini qo&apos;yadi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Xizmat nomi</label>
              <Input
                value={values.name}
                onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Masalan, Soch olish"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tavsif</label>
              <Textarea
                rows={4}
                value={values.description}
                onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="User va barber ilovada qanday ko'rinishi qisqacha yozing."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rasm URL</label>
              <Input
                value={values.image_url}
                onChange={(event) => setValues((prev) => ({ ...prev, image_url: event.target.value }))}
                placeholder="Bo'sh qoldirsangiz tizim avtomatik vizual yasaydi"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Davomiyligi (daq)</label>
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={values.duration_minutes}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, duration_minutes: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tartib</label>
                <Input
                  type="number"
                  min={0}
                  value={values.sort_order}
                  onChange={(event) => setValues((prev) => ({ ...prev, sort_order: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategoriya</label>
                <Select
                  value={values.category_id || "__none__"}
                  onValueChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      category_id: value === "__none__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategoriya tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Kategoriyasiz</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon ? `${category.icon} ` : ""}
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Faol holat</p>
                  <p className="text-xs text-muted-foreground">Barberlar faqat faol katalogni ko&apos;radi</p>
                </div>
                <Switch
                  checked={values.is_active}
                  onCheckedChange={(checked) => setValues((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
              <img
                src={serviceImageSrc(values.image_url)}
                alt={values.name || "Xizmat preview"}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <ImagePlus className="size-4" />
                Preview
              </div>
              <p className="leading-6">
                {values.name || "Xizmat nomi"} shu ko&apos;rinishda katalogda va booking flowlarda chiqadi.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Bekor qilish
          </Button>
          <Button onClick={() => onSubmit(values)} disabled={loading}>
            {loading ? "Saqlanmoqda..." : mode === "create" ? "Yaratish" : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServicesPage() {
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState<AdminService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null);
  const [serviceQuery, setServiceQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const deferredQ = useDeferredValue(serviceQuery.trim());

  const listParams = useMemo(
    () => ({
      q: deferredQ || undefined,
      category: categoryFilter,
    }),
    [deferredQ, categoryFilter],
  );

  const servicesQ = useQuery({
    queryKey: ["admin", "services", listParams],
    queryFn: () => fetchServices(listParams),
  });
  const catsQ = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => fetchCategories(),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "services"] });
    void qc.invalidateQueries({ queryKey: ["admin", "service-usage"] });
  };

  const createMut = useMutation({
    mutationFn: (values: ServiceEditorValues) =>
      createService({
        name: values.name.trim(),
        description: values.description.trim(),
        image_url: values.image_url.trim(),
        duration_minutes: Number(values.duration_minutes || 30),
        is_active: values.is_active,
        sort_order: Number(values.sort_order || 0),
        category_ids: values.category_id ? [values.category_id] : [],
      }),
    onSuccess: () => {
      invalidate();
      setEditorOpen(false);
      toast.success("Katalog xizmati yaratildi");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Katalog xizmatini yaratib bo'lmadi"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ServiceEditorValues }) =>
      updateService(id, {
        name: values.name.trim(),
        description: values.description.trim(),
        image_url: values.image_url.trim(),
        duration_minutes: Number(values.duration_minutes || 30),
        is_active: values.is_active,
        sort_order: Number(values.sort_order || 0),
        category_ids: values.category_id ? [values.category_id] : [],
      }),
    onSuccess: () => {
      invalidate();
      setEditorOpen(false);
      setEditingService(null);
      toast.success("Katalog xizmati yangilandi");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Saqlab bo'lmadi"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success("Katalog xizmati o'chirildi");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Katalog xizmatini o'chirib bo'lmadi"),
  });

  const data = servicesQ.data ?? [];
  const categories = catsQ.data ?? [];
  const servicesError = servicesQ.isError
    ? (servicesQ.error as Error)?.message || "Xizmatlar yuklab bo'lmadi"
    : null;
  const categoriesError = catsQ.isError
    ? (catsQ.error as Error)?.message || "Kategoriyalar yuklab bo'lmadi"
    : null;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Xizmatlar katalogi
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Admin bu yerda master service katalogini boshqaradi. Barberlar keyin shu katalogdan tanlaydi va
            o&apos;z narxini qo&apos;yadi.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/admin/services/analytics">Foydalanish statistikasi</Link>
          </Button>
          <Button
            onClick={() => {
              setEditingService(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="mr-1 size-4" /> Yangi katalog xizmati
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <Input
          placeholder="Xizmat nomi yoki kategoriya bo'yicha qidiruv…"
          value={serviceQuery}
          onChange={(event) => setServiceQuery(event.target.value)}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Kategoriya" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha kategoriyalar</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.icon ? `${category.icon} ` : ""}
                {category.name}
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
      ) : null}

      {servicesError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Katalog yuklanmadi</AlertTitle>
          <AlertDescription>{servicesError}</AlertDescription>
        </Alert>
      ) : servicesQ.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[360px] animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="Katalogda xizmat topilmadi"
          description="Yangi xizmat yarating yoki qidiruv filtrini o'zgartiring."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((service) => (
            <Card
              key={service.id}
              className="overflow-hidden rounded-2xl border-border bg-card/95 shadow-sm transition-shadow hover:shadow-md"
            >
              <img
                src={serviceImageSrc(service.image_url)}
                alt={service.name}
                className="aspect-[4/3] w-full object-cover"
              />
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-foreground">{service.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {service.description || "Barber va user booking flow uchun umumiy katalog xizmati."}
                    </p>
                  </div>
                  <Badge variant={service.is_active ? "default" : "secondary"}>
                    {service.is_active ? "Faol" : "Nofaol"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(service.category_names.length ? service.category_names : ["Kategoriyasiz"]).map((label) => (
                    <Badge key={label} variant="outline" className="rounded-full">
                      {label}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/20 p-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Davomiylik</p>
                    <p className="mt-1 font-semibold text-foreground">{service.duration_minutes} daqiqa</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Barberlarda</p>
                    <p className="mt-1 font-semibold text-foreground">{service.linked_rows_count} ta birikma</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditingService(service);
                      setEditorOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" /> Tahrirlash
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(service)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceEditorDialog
        open={editorOpen}
        onOpenChange={(value) => {
          setEditorOpen(value);
          if (!value) setEditingService(null);
        }}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
        }))}
        initialService={editingService}
        loading={createMut.isPending || updateMut.isPending}
        onSubmit={(values) => {
          if (!values.name.trim()) {
            toast.error("Xizmat nomini kiriting");
            return;
          }
          const duration = Number(values.duration_minutes || 0);
          if (duration < 5 || duration > 480) {
            toast.error("Davomiylik 5 va 480 daqiqa oralig'ida bo'lishi kerak");
            return;
          }
          if (editingService) {
            updateMut.mutate({ id: editingService.id, values });
            return;
          }
          createMut.mutate(values);
        }}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(value) => {
          if (!value) setDeleteTarget(null);
        }}
        title="Katalog xizmatini o'chirish"
        description={`${
          deleteTarget?.name || "Ushbu katalog xizmati"
        } o'chirilsa barberlarga biriktirilgan eski rowlar saqlanadi, lekin katalogning o'zi yo'qoladi.`}
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
