import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useBarberContext } from "@/components/barber/BarberContext";
import {
  barberQueryKeys,
  useCatalogServicesQuery,
  useScopedServicesQuery,
  useServiceRecommendationsQuery,
} from "@/hooks/use-barber-queries";
import { invalidateOnboardingAfterActivationChange } from "@/lib/onboarding-status-cache";
import { apiFetch, apiList, formatApiError } from "@/lib/api";
import { parseSomDigits, validateServicePrice } from "@/components/barber/SomPriceInput";
import type { ApiBarberService } from "@/hooks/use-barber-queries";
import type { CatalogServiceOption, PendingCatalogService, Recommendation, ServiceForm } from "./types";
import { mapService, serializeForm } from "./utils";

async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return formatApiError(body, fallback);
}

export function useServicesPage() {
  const {
    profile,
    viewMode,
    activeSalonId,
    ownsSalon,
    isJoinedWorker,
    refreshActivationStatus,
    activationSteps,
    activationServicesCount,
    fullyReady,
  } = useBarberContext();
  const qc = useQueryClient();

  const scope = viewMode === "salon" && activeSalonId ? "salon" : "independent";
  const isSalonOwnerScope = scope === "salon" && ownsSalon && Boolean(activeSalonId);
  // Barber panel barcha CRUD ni BarberService orqali boshqaradi; salon katalogi sync orqali yangilanadi.
  const servicesApiBase = "/api/v1/barber/services";
  const barberId = Number(profile.id);

  const servicesQuery = useScopedServicesQuery(servicesApiBase);
  const catalogQuery = useCatalogServicesQuery();
  const recommendationsQuery = useServiceRecommendationsQuery();

  const [services, setServices] = useState<ServiceForm[]>([]);
  const [savingServices, setSavingServices] = useState(false);
  const [catalogQueryText, setCatalogQueryText] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");
  const [pendingServices, setPendingServices] = useState<PendingCatalogService[]>([]);

  const pendingServicesRef = useRef(pendingServices);
  pendingServicesRef.current = pendingServices;
  const committedRef = useRef<string | null>(null);
  const hydratedScopeRef = useRef<string | null>(null);

  const catalogServices = (catalogQuery.data ?? []) as CatalogServiceOption[];
  const recommendations = (recommendationsQuery.data ?? []) as Recommendation[];

  const hasCachedData =
    servicesQuery.data != null || catalogQuery.data != null || recommendationsQuery.data != null;
  const isBootstrapping =
    !hasCachedData &&
    (servicesQuery.isPending || catalogQuery.isPending || recommendationsQuery.isPending);

  useEffect(() => {
    if (!servicesQuery.data) return;
    const scopeKey = `${servicesApiBase}:${barberId}`;
    const mapped = servicesQuery.data.map(mapService);
    const isNewScope = hydratedScopeRef.current !== scopeKey;
    const isDirty =
      committedRef.current !== null &&
      serializeForm(services, pendingServicesRef.current) !== committedRef.current;

    if (isNewScope || !isDirty) {
      setServices(mapped);
      committedRef.current = serializeForm(mapped, pendingServicesRef.current);
      hydratedScopeRef.current = scopeKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesQuery.data, servicesApiBase, barberId]);

  useEffect(() => {
    void refreshActivationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = useMemo(() => services.filter((item) => item.is_active).length, [services]);

  const pickerCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of catalogServices) {
      for (const categoryName of item.category_names) {
        const key = categoryName.trim();
        if (key && !map.has(key)) map.set(key, key);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [catalogServices]);

  const availableCatalog = useMemo(() => {
    const ownedCatalogIds = new Set(
      services
        .filter(
          (service) =>
            service.barber === barberId || scope === "independent" || isSalonOwnerScope,
        )
        .map((service) => service.catalog_service)
        .filter(Boolean),
    );
    return catalogServices.filter((item) => {
      const matchesCategory =
        catalogCategory === "all" || item.category_names.includes(catalogCategory);
      const matchesQuery =
        !catalogQueryText.trim() ||
        item.name.toLowerCase().includes(catalogQueryText.toLowerCase()) ||
        item.description.toLowerCase().includes(catalogQueryText.toLowerCase()) ||
        item.category_names.some((name) =>
          name.toLowerCase().includes(catalogQueryText.toLowerCase()),
        );
      return matchesCategory && matchesQuery && !ownedCatalogIds.has(String(item.id));
    });
  }, [
    barberId,
    catalogCategory,
    catalogQueryText,
    catalogServices,
    isSalonOwnerScope,
    scope,
    services,
  ]);

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
        .filter(
          (item): item is PendingCatalogService & { catalog: CatalogServiceOption } => Boolean(item),
        ),
    [catalogServices, pendingServices],
  );

  const invalidateServices = useCallback(() => {
    void qc.invalidateQueries({ queryKey: barberQueryKeys.servicesScope(servicesApiBase) });
  }, [qc, servicesApiBase]);

  const reloadServicesOnly = useCallback(async () => {
    const rows = await apiList<ApiBarberService>(`${servicesApiBase}/`);
    const nextServices = rows.map(mapService);
    setServices(nextServices);
    committedRef.current = serializeForm(nextServices, pendingServicesRef.current);
    qc.setQueryData(barberQueryKeys.servicesScope(servicesApiBase), rows);
  }, [qc, servicesApiBase]);

  const canEditService = useCallback(
    (service: ServiceForm) =>
      scope === "independent" ||
      ownsSalon ||
      service.barber == null ||
      service.barber === barberId,
    [barberId, ownsSalon, scope],
  );

  const saveService = async (service: ServiceForm) => {
    const price = parseSomDigits(String(service.price));
    const priceError = validateServicePrice(price);
    if (priceError) {
      toast.error(priceError);
      return false;
    }
    const body: Record<string, unknown> = { price, is_active: service.is_active };
    if (!service.id) {
      if (!service.catalog_service) {
        toast.error("Avval katalogdan xizmat tanlang.");
        return false;
      }
      body.catalog_service = Number(service.catalog_service);
    }
    const url = service.id ? `${servicesApiBase}/${service.id}/` : `${servicesApiBase}/`;
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
      invalidateOnboardingAfterActivationChange();
      await reloadServicesOnly();
      void refreshActivationStatus();
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
        const price = parseSomDigits(pending.price);
        const priceError = validateServicePrice(price);
        if (priceError) {
          toast.error(priceError);
          return;
        }
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
      if (!preset) setPendingServices([]);
      toast.success(
        preset ? "Xizmat qo'shildi." : `${drafts.length} ta xizmat birdaniga qo'shildi.`,
      );
      await reloadServicesOnly();
      void refreshActivationStatus();
    } finally {
      setSavingServices(false);
    }
  };

  const activateCatalogWithPrice = async (catalogId: string, priceDigits: string) => {
    const price = parseSomDigits(priceDigits);
    const priceError = validateServicePrice(price);
    if (priceError) {
      toast.error(priceError);
      return false;
    }

    const catalog = catalogServices.find((item) => String(item.id) === catalogId);
    if (!catalog) {
      toast.error("Katalog xizmati topilmadi.");
      return false;
    }

    const existing = services.find((item) => item.catalog_service === catalogId);
    const draft: ServiceForm = existing
      ? { ...existing, price: priceDigits, is_active: true }
      : {
          catalog_service: catalogId,
          name: catalog.name,
          image_url: catalog.image_url,
          duration_minutes: String(catalog.duration_minutes),
          price: priceDigits,
          is_active: true,
        };

    if (existing && !canEditService(existing)) {
      toast.warning("Bu xizmatni tahrirlash huquqingiz yo'q.");
      return false;
    }

    setSavingServices(true);
    try {
      const ok = await saveService(draft);
      if (!ok) return false;
      toast.success("Xizmat saqlandi va faollashtirildi.");
      invalidateOnboardingAfterActivationChange();
      await reloadServicesOnly();
      void refreshActivationStatus();
      return true;
    } finally {
      setSavingServices(false);
    }
  };

  const toggleServiceActive = async (service: ServiceForm) => {
    if (!service.id || !canEditService(service)) return;
    const nextActive = !service.is_active;
    setServices((prev) =>
      prev.map((item) => (item.id === service.id ? { ...item, is_active: nextActive } : item)),
    );
    const ok = await saveService({ ...service, is_active: nextActive });
    if (!ok) {
      setServices((prev) =>
        prev.map((item) =>
          item.id === service.id ? { ...item, is_active: service.is_active } : item,
        ),
      );
      return;
    }
    committedRef.current = serializeForm(
      services.map((item) =>
        item.id === service.id ? { ...item, is_active: nextActive } : item,
      ),
      pendingServicesRef.current,
    );
    toast.success(nextActive ? "Xizmat faollashtirildi — mijozlar ko‘ra oladi." : "Xizmat o‘chirildi.");
    void refreshActivationStatus();
  };

  const deleteService = async (service: ServiceForm) => {
    if (!service.id || !canEditService(service)) return;

    const tryDelete = (id: string, base = servicesApiBase) =>
      apiFetch(`${base}/${id}/`, { method: "DELETE" });

    let res = await tryDelete(service.id);

    if (!res.ok && (res.status === 403 || res.status === 404) && service.catalog_service) {
      const rows = await apiList<ApiBarberService>(`${servicesApiBase}/`);
      const match = rows.find((row) => String(row.catalog_service) === service.catalog_service);
      if (match && String(match.id) !== service.id) {
        res = await tryDelete(String(match.id));
      }
    }

    if (
      !res.ok &&
      (res.status === 403 || res.status === 404) &&
      isSalonOwnerScope &&
      activeSalonId
    ) {
      res = await tryDelete(service.id, `/api/v1/salons/${activeSalonId}/services`);
    }

    if (!res.ok) {
      toast.error(await parseError(res, "Xizmatni o'chirib bo'lmadi."));
      return;
    }
    toast.success("Xizmat o'chirildi.");
    await reloadServicesOnly();
    void refreshActivationStatus();
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
    const merged: ServiceForm = { ...svc, price: rec.suggested_price ?? svc.price };
    setSavingServices(true);
    try {
      const ok = await saveService(merged);
      if (!ok) return;
      toast.success("Tavsiya saqlandi.");
      await reloadServicesOnly();
      void refreshActivationStatus();
    } finally {
      setSavingServices(false);
    }
  };

  const updateServicePrice = (serviceId: string | undefined, digits: string) => {
    setServices((prev) =>
      prev.map((item) => (item.id === serviceId ? { ...item, price: digits } : item)),
    );
  };

  const isDirty = useCallback(() => {
    if (committedRef.current === null) return false;
    return serializeForm(services, pendingServices) !== committedRef.current;
  }, [pendingServices, services]);

  const queryError =
    servicesQuery.error ?? catalogQuery.error ?? recommendationsQuery.error ?? null;

  useEffect(() => {
    if (!queryError) return;
    toast.error(
      queryError instanceof Error ? queryError.message : "Ma'lumotlarni yuklab bo'lmadi.",
    );
  }, [queryError]);

  const isRefreshing =
    hasCachedData &&
    (servicesQuery.isFetching || catalogQuery.isFetching || recommendationsQuery.isFetching);

  return {
    scope,
    isSalonOwnerScope,
    isJoinedWorker,
    fullyReady,
    activationSteps,
    activationServicesCount,
    refreshActivationStatus,
    services,
    catalogServices,
    recommendations,
    activeCount,
    savingServices,
    isBootstrapping,
    isRefreshing,
    catalogQuery: catalogQueryText,
    setCatalogQuery: setCatalogQueryText,
    catalogCategory,
    setCatalogCategory,
    pendingServices,
    setPendingServices,
    pickerCategories,
    availableCatalog,
    selectedCatalogIds,
    selectedCatalogRows,
    canEditService,
    saveAllServices,
    togglePendingCatalog,
    updatePendingCatalog,
    addService,
    activateCatalogWithPrice,
    toggleServiceActive,
    deleteService,
    applyRecommendation,
    updateServicePrice,
    isDirty,
    committedRef,
  };
}

export type ServicesPageState = ReturnType<typeof useServicesPage>;
