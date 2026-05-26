import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Loader2, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyBlock, PageHeader, SectionCard, StatusPill } from "@/components/barber/primitives";
import { useBarberContext } from "@/components/barber/BarberContext";
import { API_BASE, apiFetch, apiList, formatApiError } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/services")({
  component: ServicesSchedulePage,
});

type ApiService = {
  id: number;
  barber?: number | null;
  catalog_service?: number | null;
  name: string;
  price: string | number;
  duration_minutes: number;
  is_active: boolean;
  image_url?: string;
};

type ServiceForm = {
  id?: string;
  barber?: number | null;
  catalog_service?: string;
  name: string;
  image_url?: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
};

type CatalogServiceOption = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  duration_minutes: number;
  category_ids: number[];
  category_names: string[];
  sort_order: number;
  index: number;
};

type PendingCatalogService = {
  catalog_service: string;
  price: string;
  is_active: boolean;
};

type Recommendation = {
  kind: string;
  title: string;
  description: string;
  action_label: string;
  service_id?: number;
  suggested_price?: string;
  suggested_duration_minutes?: number;
  suggested_service?: {
    name: string;
    price: string;
    duration_minutes: number;
  };
};

const FALLBACK_SERVICE_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 520'%3E%3Crect width='800' height='520' rx='36' fill='%23111827'/%3E%3Ccircle cx='620' cy='120' r='120' fill='%232563eb' fill-opacity='0.25'/%3E%3Ccircle cx='700' cy='410' r='100' fill='%23ec4899' fill-opacity='0.18'/%3E%3Ctext x='72' y='274' font-family='Arial,sans-serif' font-size='56' font-weight='700' fill='white'%3EXizmat%3C/text%3E%3Ctext x='72' y='328' font-family='Arial,sans-serif' font-size='24' fill='rgba(255,255,255,0.8)'%3EMyBarber katalog%3C/text%3E%3C/svg%3E";

function serviceImageSrc(path?: string | null): string {
  const value = String(path || "").trim();
  if (!value) return FALLBACK_SERVICE_IMAGE;
  if (value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE}${normalized}`;
}

function mapService(row: ApiService): ServiceForm {
  return {
    id: String(row.id),
    barber: row.barber ?? null,
    catalog_service: row.catalog_service ? String(row.catalog_service) : "",
    name: row.name,
    image_url: row.image_url || "",
    price: String(Number(row.price)),
    duration_minutes: String(row.duration_minutes),
    is_active: Boolean(row.is_active),
  };
}

function serializeForm(
  services: ServiceForm[],
  pendingServices: PendingCatalogService[],
): string {
  return JSON.stringify({
    services: services.map((s) => ({
      id: s.id,
      barber: s.barber ?? null,
      catalog_service: s.catalog_service ?? "",
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      is_active: s.is_active,
    })),
    pendingServices: pendingServices.map((service) => ({
      catalog_service: service.catalog_service,
      price: service.price,
      is_active: service.is_active,
    })),
  });
}

async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return formatApiError(body, fallback);
}

function ServicesSchedulePage() {
  const {
    profile,
    viewMode,
    activeSalonId,
    ownsSalon,
    isJoinedWorker,
    refreshActivationStatus,
    activationSteps,
    fullyReady,
  } = useBarberContext();
  const scope = viewMode === "salon" && activeSalonId ? "salon" : "independent";
  const barberId = Number(profile.id);
  const [services, setServices] = useState<ServiceForm[]>([]);
  const [catalogServices, setCatalogServices] = useState<CatalogServiceOption[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingServices, setSavingServices] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");
  const [pendingServices, setPendingServices] = useState<PendingCatalogService[]>([]);

  const pendingServicesRef = useRef(pendingServices);
  pendingServicesRef.current = pendingServices;
  const committedRef = useRef<string | null>(null);

  const activeCount = useMemo(() => services.filter((item) => item.is_active).length, [services]);
  const pickerCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of catalogServices) {
      for (const categoryName of item.category_names) {
        const key = categoryName.trim();
        if (key && !map.has(key)) {
          map.set(key, key);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [catalogServices]);
  const availableCatalog = useMemo(() => {
    const ownedCatalogIds = new Set(
      services
        .filter((service) => service.barber === barberId || scope === "independent")
        .map((service) => service.catalog_service)
        .filter(Boolean),
    );
    return catalogServices.filter((item) => {
      const matchesCategory =
        catalogCategory === "all" || item.category_names.includes(catalogCategory);
      const matchesQuery =
        !catalogQuery.trim() ||
        item.name.toLowerCase().includes(catalogQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(catalogQuery.toLowerCase()) ||
        item.category_names.some((name) =>
          name.toLowerCase().includes(catalogQuery.toLowerCase()),
        );
      return matchesCategory && matchesQuery && !ownedCatalogIds.has(String(item.id));
    });
  }, [barberId, catalogCategory, catalogQuery, catalogServices, scope, services]);
  const selectedCatalogIds = useMemo(
    () => new Set(pendingServices.map((service) => service.catalog_service)),
    [pendingServices],
  );
  const selectedCatalogRows = useMemo(
    () =>
      pendingServices
        .map((service) => {
          const catalog = catalogServices.find((item) => String(item.id) === service.catalog_service);
          if (!catalog) return null;
          return { ...service, catalog };
        })
        .filter((item): item is PendingCatalogService & { catalog: CatalogServiceOption } => Boolean(item)),
    [catalogServices, pendingServices],
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      let nextServices: ServiceForm[];
      let recs: Recommendation[];

      const [serviceRows, recsList, catalogRows] = await Promise.all([
        apiList<ApiService>("/api/v1/barber/services/"),
        apiList<Recommendation>("/api/v1/barber/service-recommendations/"),
        apiList<CatalogServiceOption>("/api/v1/barber/catalog-services/"),
      ]);
      nextServices = serviceRows.map(mapService);
      recs = recsList;
      setServices(nextServices);
      setRecommendations(recs);
      setCatalogServices(catalogRows);
      committedRef.current = serializeForm(nextServices, pendingServicesRef.current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ma'lumotlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, activeSalonId, barberId]);

  const canEditService = (service: ServiceForm) =>
    scope === "independent" ||
    ownsSalon ||
    service.barber == null ||
    service.barber === barberId;

  const saveService = async (service: ServiceForm) => {
    const price = Number(service.price);
    if (!price) {
      toast.error("Xizmat narxini kiriting.");
      return false;
    }
    if (price <= 0) {
      toast.error("Xizmat narxi noldan katta bo'lishi kerak.");
      return false;
    }
    const body: Record<string, unknown> = {
      price,
      is_active: service.is_active,
    };
    if (!service.id) {
      if (!service.catalog_service) {
        toast.error("Avval katalogdan xizmat tanlang.");
        return false;
      }
      body.catalog_service = Number(service.catalog_service);
    }
    const url = service.id
      ? `/api/v1/barber/services/${service.id}/`
      : "/api/v1/barber/services/";
    const res = await apiFetch(url, {
      method: service.id ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error(await parseError(res, "Xizmatni saqlab bo'lmadi."));
      return false;
    }
    return true;
  };

  const saveAllServices = async () => {
    setSavingServices(true);
    try {
      const editable = services.filter(canEditService);
      if (services.length > 0 && editable.length === 0) {
        toast.warning("Bu ro'yxatdagi xizmatlarni tahrirlash yoki saqlash huquqingiz yo'q.");
        return;
      }
      const results = await Promise.all(editable.map((service) => saveService(service)));
      if (!results.every(Boolean)) return;
      const readOnlyCount = services.length - editable.length;
      toast.success("Sizning xizmatlaringiz saqlandi.", {
        description:
          readOnlyCount > 0
            ? `${readOnlyCount} ta qator faqat ko'rish rejimida — ular o'zgartirilmadi.`
            : undefined,
      });
      await loadAll();
      await refreshActivationStatus();
    } finally {
      setSavingServices(false);
    }
  };

  const togglePendingCatalog = (catalogId: string) => {
    setPendingServices((prev) => {
      if (prev.some((service) => service.catalog_service === catalogId)) {
        return prev.filter((service) => service.catalog_service !== catalogId);
      }
      return [...prev, { catalog_service: catalogId, price: "", is_active: true }];
    });
  };

  const updatePendingCatalog = (
    catalogId: string,
    patch: Partial<Pick<PendingCatalogService, "price" | "is_active">>,
  ) => {
    setPendingServices((prev) =>
      prev.map((service) =>
        service.catalog_service === catalogId ? { ...service, ...patch } : service,
      ),
    );
  };

  const addService = async (preset?: Recommendation["suggested_service"]) => {
    const drafts: ServiceForm[] = [];
    if (preset) {
      const matchedCatalog = catalogServices.find(
        (item) => item.name.trim().toLowerCase() === preset.name.trim().toLowerCase(),
      );
      if (!matchedCatalog) {
        toast.error("Tavsiya uchun katalog xizmati topilmadi.");
        return;
      }
      drafts.push({
        catalog_service: String(matchedCatalog.id),
        name: matchedCatalog.name,
        image_url: matchedCatalog.image_url,
        duration_minutes: String(matchedCatalog.duration_minutes),
        price: String(preset.price),
        is_active: true,
      });
    } else {
      if (pendingServices.length === 0) {
        toast.error("Kamida bitta katalog xizmatini tanlang.");
        return;
      }
      for (const pending of pendingServices) {
        const matchedCatalog = catalogServices.find(
          (item) => String(item.id) === pending.catalog_service,
        );
        if (!matchedCatalog) {
          toast.error("Tanlangan xizmatlardan biri katalogda topilmadi.");
          return;
        }
        drafts.push({
          catalog_service: pending.catalog_service,
          name: matchedCatalog.name,
          image_url: matchedCatalog.image_url,
          duration_minutes: String(matchedCatalog.duration_minutes),
          price: pending.price,
          is_active: pending.is_active,
        });
      }
    }
    setSavingServices(true);
    try {
      const results = await Promise.all(drafts.map((draft) => saveService(draft)));
      if (!results.every(Boolean)) return;
      if (!preset) {
        setPendingServices([]);
      }
      toast.success(
        preset ? "Xizmat qo'shildi." : `${drafts.length} ta xizmat birdaniga qo'shildi.`,
      );
      await loadAll();
      await refreshActivationStatus();
    } finally {
      setSavingServices(false);
    }
  };

  const deleteService = async (service: ServiceForm) => {
    if (!service.id || !canEditService(service)) return;
    const endpoint = `/api/v1/barber/services/${service.id}/`;
    const res = await apiFetch(endpoint, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await parseError(res, "Xizmatni o'chirib bo'lmadi."));
      return;
    }
    toast.success("Xizmat o'chirildi.");
    await loadAll();
    await refreshActivationStatus();
  };

  const applyRecommendation = async (rec: Recommendation) => {
    if (rec.suggested_service) {
      await addService(rec.suggested_service);
      return;
    }
    if (!rec.service_id) return;
    const svc = services.find((s) => s.id === String(rec.service_id));
    if (!svc || !canEditService(svc)) {
      toast.error("Bu tavsiyani qo'llash uchun ushbu xizmatni tahrirlash huquqingiz yo'q.");
      return;
    }
    const merged: ServiceForm = {
      ...svc,
      price: rec.suggested_price ?? svc.price,
    };
    setSavingServices(true);
    try {
      const ok = await saveService(merged);
      if (!ok) return;
      toast.success("Tavsiya saqlandi.");
      await loadAll();
      await refreshActivationStatus();
    } finally {
      setSavingServices(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    const raw = window.location.hash.replace(/^#/, "");
    if (raw === "activation-services") {
      window.requestAnimationFrame(() => {
        document.getElementById(raw)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [loading]);

  const blocker = useBlocker({
    shouldBlockFn: useCallback(() => {
      if (loading || savingServices) return false;
      if (committedRef.current === null) return false;
      return serializeForm(services, pendingServices) !== committedRef.current;
    }, [loading, savingServices, services, pendingServices]),
    withResolver: true,
    enableBeforeUnload: true,
    disabled: loading,
  });

  return (
    <>
      <div className="mx-auto max-w-[1180px] space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Xizmatlar"
          description={
            scope === "salon"
              ? "Admin katalogidagi xizmatlarni o'zingizga biriktirib, narxlarni boshqaring. Ish vaqti alohida sahifada."
              : "Mustaqil booking uchun admin katalogidagi xizmatlarni tanlab, narxlarni sozlang. Ish jadvali alohida."
          }
          actions={
            <div className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              {scope === "salon" ? "Salon staff" : "Mustaqil barber"}
            </div>
          }
        />

        {!fullyReady && activationSteps.services_ok && !activationSteps.schedule_ok ? (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/35 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              <span className="font-medium">Keyingi qadam:</span>{" "}
              <span className="font-medium">Ish jadvali</span> sahifasida haftalik vaqtni sozlang va
              saqlang.
            </p>
            <Button type="button" variant="default" className="shrink-0" asChild>
              <Link to="/barber/schedule">Ish jadvaliga o&apos;tish</Link>
            </Button>
          </div>
        ) : null}

        {!fullyReady &&
        !activationSteps.services_ok &&
        activeCount >= 5 &&
        !savingServices ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            <span className="font-medium">5 ta faol xizmat</span> ko&apos;rinmoqda. Serverga
            yozilishini tekshirish uchun{" "}
            <span className="font-medium">Xizmatlarni saqlash</span> ni bosing, so&apos;ng{" "}
            <span className="font-medium">Profil tayyorligi</span> sahifasiga qayting.
          </div>
        ) : null}

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <div id="activation-services" className="scroll-mt-24">
              <SectionCard
                title="Xizmatlar"
                description={`${activeCount} ta faol xizmat. Narxni siz boshqarasiz, davomiylik va nom esa admin katalogidan keladi.`}
                actions={
                  <button
                    onClick={saveAllServices}
                    disabled={savingServices}
                    className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
                  >
                    {savingServices ? "Saqlanmoqda..." : "Xizmatlarni saqlash"}
                  </button>
                }
              >
                <div className="space-y-3">
                  {services.length === 0 ? (
                    <EmptyBlock
                      title="Hali xizmat yo'q"
                      description="Mijozlar booking qilishi uchun kamida bitta xizmat qo'shing."
                      icon={<Sparkles className="size-4" />}
                    />
                  ) : (
                    services.map((service) => {
                      const editable = canEditService(service);
                      return (
                        <div
                          key={service.id}
                          className={cn(
                            "grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1.5fr)_130px_90px_auto]",
                            !editable && "opacity-70",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                            <img
                              src={serviceImageSrc(service.image_url)}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{service.name}</p>
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="size-3.5" /> {service.duration_minutes} daqiqa
                              </p>
                            </div>
                          </div>
                          <input
                            type="number"
                            value={service.price}
                            disabled={!editable}
                            onChange={(event) =>
                              setServices((prev) =>
                                prev.map((item) =>
                                  item.id === service.id
                                    ? { ...item, price: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() =>
                              setServices((prev) =>
                                prev.map((item) =>
                                  item.id === service.id
                                    ? { ...item, is_active: !item.is_active }
                                    : item,
                                ),
                              )
                            }
                            className={cn(
                              "h-10 rounded-lg border px-2 text-xs font-medium",
                              service.is_active
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background text-muted-foreground",
                            )}
                          >
                            {service.is_active ? "Faol" : "O'chiq"}
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => void deleteService(service)}
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-muted-foreground hover:text-destructive disabled:cursor-not-allowed"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div className="space-y-4 rounded-xl border border-dashed border-border p-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={catalogQuery}
                          onChange={(event) => setCatalogQuery(event.target.value)}
                          placeholder="Katalogdan xizmat qidiring"
                          className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <select
                        value={catalogCategory}
                        onChange={(event) => setCatalogCategory(event.target.value)}
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="all">Barcha kategoriyalar</option>
                        {pickerCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {availableCatalog.map((item) => {
                        const selected = selectedCatalogIds.has(String(item.id));
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => togglePendingCatalog(String(item.id))}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                              selected
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background hover:border-foreground/40",
                            )}
                          >
                            <img
                              src={serviceImageSrc(item.image_url)}
                              alt=""
                              className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{item.name}</p>
                              <p
                                className={cn(
                                  "mt-1 line-clamp-2 text-xs",
                                  selected ? "text-background/75" : "text-muted-foreground",
                                )}
                              >
                                {item.description || item.category_names.join(" · ") || "Admin katalog xizmati"}
                              </p>
                              <p
                                className={cn(
                                  "mt-2 flex items-center gap-1 text-xs",
                                  selected ? "text-background/75" : "text-muted-foreground",
                                )}
                              >
                                <Clock className="size-3.5" /> {item.duration_minutes} daqiqa
                              </p>
                            </div>
                            {selected ? <CheckCircle2 className="size-5 shrink-0" /> : null}
                          </button>
                        );
                      })}
                    </div>

                    {availableCatalog.length === 0 ? (
                      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                        Qidiruv bo&apos;yicha yangi katalog xizmati topilmadi yoki bular allaqachon sizga biriktirilgan.
                      </div>
                    ) : null}

                    {selectedCatalogRows.length > 0 ? (
                      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">
                            Tanlangan xizmatlar: {selectedCatalogRows.length} ta
                          </p>
                          <button
                            type="button"
                            onClick={() => setPendingServices([])}
                            className="text-xs font-medium text-muted-foreground underline underline-offset-4"
                          >
                            Tozalash
                          </button>
                        </div>
                        <div className="space-y-3">
                          {selectedCatalogRows.map(({ catalog, catalog_service, price, is_active }) => (
                            <div
                              key={catalog_service}
                              className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-[minmax(0,1.4fr)_130px_90px_auto]"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <img
                                  src={serviceImageSrc(catalog.image_url)}
                                  alt=""
                                  className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {catalog.name}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="size-3.5" /> {catalog.duration_minutes} daqiqa
                                  </p>
                                </div>
                              </div>
                              <input
                                type="number"
                                min={0}
                                value={price}
                                onChange={(event) =>
                                  updatePendingCatalog(catalog_service, {
                                    price: event.target.value,
                                  })
                                }
                                placeholder="Narx"
                                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updatePendingCatalog(catalog_service, {
                                    is_active: !is_active,
                                  })
                                }
                                className={cn(
                                  "h-10 rounded-lg border px-2 text-xs font-medium",
                                  is_active
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-border bg-background text-muted-foreground",
                                )}
                              >
                                {is_active ? "Faol" : "O'chiq"}
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePendingCatalog(catalog_service)}
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => void addService()}
                          disabled={savingServices || selectedCatalogRows.length === 0}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
                        >
                          <Plus className="size-4" />
                          {selectedCatalogRows.length} ta xizmatni qo&apos;shish
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                        Bir nechta xizmatni belgilab, har biriga narx yozing va hammasini bitta bosishda qo&apos;shing.
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
              </div>
            </div>

            <aside className="space-y-6">
              <SectionCard
                title="Tavsiyalar"
                description="Mavjud xizmat va bookinglardan qoida asosidagi maslahatlar."
              >
                {recommendations.length === 0 ? (
                  <EmptyBlock
                    title="Tavsiya yo'q"
                    description="Xizmatlar va bookinglar ko'paygach bu yerda foydali maslahatlar chiqadi."
                    icon={<Sparkles className="size-4" />}
                  />
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <button
                        key={`${rec.kind}-${rec.service_id ?? index}`}
                        type="button"
                        onClick={() => void applyRecommendation(rec)}
                        className="w-full rounded-xl border border-border bg-muted/30 p-3 text-left transition-colors hover:bg-muted"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="font-medium text-sm">{rec.title}</div>
                          <StatusPill status="active" label={rec.action_label} />
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">{rec.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Ish jadvali">
                <p className="text-sm text-muted-foreground">
                  Haftalik ish vaqti, dam kunlari va tanaffuslar alohida sahifada boshqariladi.
                </p>
                <Link
                  to="/barber/schedule"
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Ish jadvalini ochish
                </Link>
              </SectionCard>

              <SectionCard title="Bookingga ta'siri">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <Clock className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Slot uzunligi admin katalogida berilgan davomiyliklar yig&apos;indisi bo&apos;yicha
                      hisoblanadi.
                    </p>
                  </div>
                  <p>
                    Faol bo&apos;lmagan xizmatlar user app’da ko&apos;rinmaydi.{" "}
                    <Link to="/barber/schedule" className="font-medium text-foreground underline-offset-4 hover:underline">
                      Ish jadvali
                    </Link>{" "}
                    bo&apos;yicha dam kunlari va tanaffuslar yopiq slot sifatida qaytadi.
                  </p>
                  {scope === "salon" && isJoinedWorker && (
                    <p>
                      Salon-wide xizmatlar ko'rinishi mumkin, lekin siz faqat o'zingizga bog'langan
                      xizmatlarni tahrirlaysiz.
                    </p>
                  )}
                </div>
              </SectionCard>
            </aside>
          </div>
        )}
      </div>

      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saqlanmagan o&apos;zgarishlar</AlertDialogTitle>
            <AlertDialogDescription>
              Sahifadan chiqsangiz, kiritilgan o&apos;zgarishlar yo&apos;qolishi mumkin. Davom
              etasizmi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={() => blocker.reset?.()}>
              Sahifada qolish
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => blocker.proceed?.()}
            >
              Chiqish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
