import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE } from "@/lib/api";
import {
  deleteServiceAssignment,
  fetchCategories,
  fetchServiceUsage,
  type AdminServiceAssignment,
  updateServiceAssignment,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/services/analytics")({
  component: ServicesAnalyticsPage,
});

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

function currency(value: number): string {
  return `${Math.round(value).toLocaleString()} so'm`;
}

function AssignmentEditorDialog({
  open,
  onOpenChange,
  assignment,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  assignment: AdminServiceAssignment | null;
  loading: boolean;
  onSubmit: (values: { price: string; is_active: boolean }) => void;
}) {
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open || !assignment) return;
    setPrice(String(assignment.price || 0));
    setIsActive(assignment.is_active);
  }, [open, assignment]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Biriktirilgan service row</DialogTitle>
          <DialogDescription>
            Bu yerda barber yoki salon row uchun faqat narx va holatni boshqarasiz.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
            <p className="font-medium text-foreground">{assignment?.service_name || "—"}</p>
            <p className="mt-1 text-muted-foreground">
              {assignment?.type === "salon"
                ? `${assignment?.salon_name || "Salon"} · ${assignment?.barber_name || "Salon-wide"}`
                : assignment?.barber_name || "Mustaqil barber"}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Narx</label>
            <Input type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Faol holat</p>
              <p className="text-xs text-muted-foreground">User bookinglarda ko&apos;rinadigan flag</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Bekor qilish
          </Button>
          <Button onClick={() => onSubmit({ price, is_active: isActive })} disabled={loading}>
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServicesAnalyticsPage() {
  const qc = useQueryClient();
  const [serviceQuery, setServiceQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingAssignment, setEditingAssignment] = useState<AdminServiceAssignment | null>(null);
  const [deleteAssignment, setDeleteAssignment] = useState<AdminServiceAssignment | null>(null);
  const deferredQ = useDeferredValue(serviceQuery.trim());

  const params = useMemo(
    () => ({
      q: deferredQ || undefined,
      category: categoryFilter,
    }),
    [deferredQ, categoryFilter],
  );

  const usageQ = useQuery({
    queryKey: ["admin", "service-usage", params],
    queryFn: () => fetchServiceUsage(params),
  });
  const catsQ = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => fetchCategories(),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin", "service-usage"] });

  const updateMut = useMutation({
    mutationFn: ({
      assignment,
      values,
    }: {
      assignment: AdminServiceAssignment;
      values: { price: string; is_active: boolean };
    }) =>
      updateServiceAssignment(assignment.type, assignment.id, {
        price: Number(values.price || 0),
        is_active: values.is_active,
      }),
    onSuccess: () => {
      invalidate();
      setEditingAssignment(null);
      toast.success("Biriktirilgan service row yangilandi");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Saqlab bo'lmadi"),
  });

  const deleteMut = useMutation({
    mutationFn: (assignment: AdminServiceAssignment) =>
      deleteServiceAssignment(assignment.type, assignment.id),
    onSuccess: () => {
      invalidate();
      setDeleteAssignment(null);
      toast.success("Biriktirilgan service row o'chirildi");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "O'chirib bo'lmadi"),
  });

  const services = usageQ.data ?? [];
  const categories = catsQ.data ?? [];
  const usageError = usageQ.isError
    ? (usageQ.error as Error)?.message || "Service analytics yuklanmadi"
    : null;

  const totals = useMemo(
    () =>
      services.reduce(
        (acc, service) => {
          acc.total += service.bookings_total;
          acc.completed += service.bookings_completed;
          acc.cancelled += service.bookings_cancelled;
          return acc;
        },
        { total: 0, completed: 0, cancelled: 0 },
      ),
    [services],
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Service foydalanish statistikasi
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Tepada master service natijalari chiqadi, pastda esa aynan qaysi barber yoki salon row ishlaganini
          drilldown ichida ko&apos;rasiz.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Jami booking line</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{totals.total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Yakunlangan</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{totals.completed.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Bekor qilingan</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{totals.cancelled.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <Input
          placeholder="Service, tavsif yoki kategoriya bo'yicha qidiruv…"
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

      {usageError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Analytics yuklanmadi</AlertTitle>
          <AlertDescription>{usageError}</AlertDescription>
        </Alert>
      ) : usageQ.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          title="Service analytics topilmadi"
          description="Filtrlarni o'zgartiring yoki barberlarda catalog xizmatlari ishlatilishini kuting."
        />
      ) : (
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-4">
          {services.map((service) => (
            <AccordionItem key={service.id} value={service.id} className="border-border">
              <AccordionTrigger className="gap-4 py-5 hover:no-underline">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <img
                    src={serviceImageSrc(service.image_url)}
                    alt={service.name}
                    className="h-20 w-24 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-left text-lg font-semibold text-foreground">
                        {service.name}
                      </p>
                      <Badge variant={service.is_active ? "default" : "secondary"}>
                        {service.is_active ? "Faol" : "Nofaol"}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-left text-sm text-muted-foreground">
                      {service.description || "Bu service bo'yicha barberlar va booking natijalari."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(service.category_names.length ? service.category_names : ["Kategoriyasiz"]).map(
                        (label) => (
                          <Badge key={label} variant="outline" className="rounded-full">
                            {label}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="grid min-w-[340px] grid-cols-4 gap-3 text-left text-sm">
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Barberlar</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{service.barbers_count}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Jami</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{service.bookings_total}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Bekor</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{service.bookings_cancelled}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Cancel rate</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{service.cancellation_rate}%</p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-5">
                {service.rows.length === 0 ? (
                  <EmptyState
                    title="Hali barber biriktirmagan"
                    description="Bu catalog service hali barber yoki salon rowga aylantirilmagan."
                  />
                ) : (
                  <div className="rounded-2xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tur</TableHead>
                          <TableHead>Barber / Salon</TableHead>
                          <TableHead>Narx</TableHead>
                          <TableHead>Jami</TableHead>
                          <TableHead>Yakunlangan</TableHead>
                          <TableHead>Bekor</TableHead>
                          <TableHead>Holat</TableHead>
                          <TableHead className="text-right">Amallar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {service.rows.map((row) => (
                          <TableRow key={`${row.type}-${row.id}`}>
                            <TableCell>{row.type === "salon" ? "Salon" : "Mustaqil"}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground">
                                  {row.barber_name || row.salon_name || "Salon-wide"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {row.type === "salon" ? row.salon_name || "Salon" : "Barber row"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{currency(row.price)}</TableCell>
                            <TableCell>{row.bookings_total}</TableCell>
                            <TableCell>{row.bookings_completed}</TableCell>
                            <TableCell>{row.bookings_cancelled}</TableCell>
                            <TableCell>
                              <Badge variant={row.is_active ? "default" : "secondary"}>
                                {row.is_active ? "Faol" : "Nofaol"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingAssignment(row)}
                                >
                                  <Pencil className="mr-2 size-4" /> Tahrirlash
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteAssignment(row)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <AssignmentEditorDialog
        open={!!editingAssignment}
        onOpenChange={(value) => {
          if (!value) setEditingAssignment(null);
        }}
        assignment={editingAssignment}
        loading={updateMut.isPending}
        onSubmit={(values) => {
          if (!editingAssignment) return;
          const price = Number(values.price || 0);
          if (price < 0) {
            toast.error("Narx manfiy bo'lmasligi kerak");
            return;
          }
          updateMut.mutate({ assignment: editingAssignment, values });
        }}
      />

      <DeleteConfirmDialog
        open={!!deleteAssignment}
        onOpenChange={(value) => {
          if (!value) setDeleteAssignment(null);
        }}
        title="Biriktirilgan service rowni o'chirish"
        description={`${
          deleteAssignment?.service_name || "Ushbu row"
        } o'chirilsa barberdagi aynan shu narxli service yo'qoladi.`}
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (!deleteAssignment) return;
          deleteMut.mutate(deleteAssignment);
        }}
      />
    </div>
  );
}
