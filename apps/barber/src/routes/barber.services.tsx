import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyBlock, PageHeader, SectionCard, StatusPill } from "@/components/barber/primitives";
import { useBarberContext } from "@/components/barber/BarberContext";
import { apiFetch, apiList, formatApiError } from "@/lib/api";
import { SIGNUP_FLOW_PATH } from "@/lib/barber-flow-config";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/services")({
  component: ServicesSchedulePage,
});

type ApiService = {
  id: number;
  barber?: number | null;
  name: string;
  price: string | number;
  duration_minutes: number;
  is_active: boolean;
};

type ServiceForm = {
  id?: string;
  barber?: number | null;
  name: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
};

type ApiWorkingHour = {
  id: number;
  membership?: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
  breaks?: BreakItem[];
};

type DayForm = {
  id?: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
  breaksText: string;
};

type BreakItem = { start: string; end: string };

type Membership = {
  id: number;
  barber: number | null;
  salon: number;
  role: string;
  invite_state: string;
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

const WEEKDAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

const defaultDays = (): DayForm[] =>
  WEEKDAYS.map((_, weekday) => ({
    weekday,
    open_time: "09:00",
    close_time: "18:00",
    is_day_off: weekday === 6,
    breaksText: weekday === 6 ? "" : "12:00-13:00",
  }));

function mapService(row: ApiService): ServiceForm {
  return {
    id: String(row.id),
    barber: row.barber ?? null,
    name: row.name,
    price: String(Number(row.price)),
    duration_minutes: String(row.duration_minutes),
    is_active: Boolean(row.is_active),
  };
}

function applyHours(rows: ApiWorkingHour[]): DayForm[] {
  const byWeekday = new Map(rows.map((row) => [row.weekday, row]));
  return defaultDays().map((day) => {
    const row = byWeekday.get(day.weekday);
    if (!row) return day;
    return {
      id: row.id,
      weekday: row.weekday,
      open_time: String(row.open_time).slice(0, 5),
      close_time: String(row.close_time).slice(0, 5),
      is_day_off: Boolean(row.is_day_off),
      breaksText: (row.breaks || []).map((br) => `${br.start}-${br.end}`).join(", "),
    };
  });
}

function parseBreaks(input: string): BreakItem[] {
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [start, end] = part.split("-").map((v) => v.trim());
      if (!/^\d{2}:\d{2}$/.test(start || "") || !/^\d{2}:\d{2}$/.test(end || "")) {
        throw new Error("Tanaffus HH:MM-HH:MM formatida bo'lishi kerak.");
      }
      if (start >= end) {
        throw new Error("Tanaffus boshlanishi tugashidan oldin bo'lishi kerak.");
      }
      return { start, end };
    });
}

function serializeForm(services: ServiceForm[], days: DayForm[], newService: ServiceForm): string {
  return JSON.stringify({
    services: services.map((s) => ({
      id: s.id,
      barber: s.barber ?? null,
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      is_active: s.is_active,
    })),
    days: days.map((d) => ({
      id: d.id,
      weekday: d.weekday,
      open_time: d.open_time,
      close_time: d.close_time,
      is_day_off: d.is_day_off,
      breaksText: d.breaksText,
    })),
    newService: {
      name: newService.name,
      price: newService.price,
      duration_minutes: newService.duration_minutes,
      is_active: newService.is_active,
    },
  });
}

async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return formatApiError(body, fallback);
}

function ServicesSchedulePage() {
  const { profile, viewMode, activeSalonId, ownsSalon, isJoinedWorker } = useBarberContext();
  const scope = viewMode === "salon" && activeSalonId ? "salon" : "independent";
  const barberId = Number(profile.id);
  const [services, setServices] = useState<ServiceForm[]>([]);
  const [days, setDays] = useState<DayForm[]>(defaultDays);
  const [membershipId, setMembershipId] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingServices, setSavingServices] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [newService, setNewService] = useState<ServiceForm>({
    name: "",
    price: "",
    duration_minutes: "",
    is_active: true,
  });

  const newServiceRef = useRef(newService);
  newServiceRef.current = newService;
  const committedRef = useRef<string | null>(null);

  const activeCount = useMemo(() => services.filter((item) => item.is_active).length, [services]);

  const loadAll = async () => {
    setLoading(true);
    try {
      let nextServices: ServiceForm[];
      let nextDays: DayForm[];
      let recs: Recommendation[];

      if (scope === "salon") {
        const memberships = await apiList<Membership>(
          `/api/v1/memberships/?salon=${activeSalonId}`,
        );
        const ownMembership = memberships.find((m) => m.barber === barberId) ?? null;
        setMembershipId(ownMembership?.id ?? null);
        const [serviceRows, scheduleRows, recsList] = await Promise.all([
          apiList<ApiService>(`/api/v1/services/?salon=${activeSalonId}&barber=${barberId}`),
          ownMembership
            ? apiList<ApiWorkingHour>(`/api/v1/schedules/?membership=${ownMembership.id}`)
            : Promise.resolve([]),
          apiList<Recommendation>("/api/v1/barber/service-recommendations/"),
        ]);
        nextServices = serviceRows.map(mapService);
        nextDays = applyHours(scheduleRows);
        recs = recsList;
        setServices(nextServices);
        setDays(nextDays);
        setRecommendations(recs);
      } else {
        const [serviceRows, scheduleRows, recsList] = await Promise.all([
          apiList<ApiService>("/api/v1/barber/services/"),
          apiList<ApiWorkingHour>("/api/v1/barber/working-hours/"),
          apiList<Recommendation>("/api/v1/barber/service-recommendations/"),
        ]);
        setMembershipId(null);
        nextServices = serviceRows.map(mapService);
        nextDays = applyHours(scheduleRows);
        recs = recsList;
        setServices(nextServices);
        setDays(nextDays);
        setRecommendations(recs);
      }
      committedRef.current = serializeForm(nextServices, nextDays, newServiceRef.current);
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
    scope === "independent" || ownsSalon || service.barber === barberId;

  const saveService = async (service: ServiceForm) => {
    const name = service.name.trim();
    const duration = Number(service.duration_minutes);
    const price = Number(service.price);
    if (!name || !price || !duration) {
      toast.error("Xizmat nomi, narxi va davomiyligini to'ldiring.");
      return false;
    }
    if (duration < 5 || duration > 480 || price <= 0) {
      toast.error(
        "Xizmat davomiyligi 5 dan 480 daqiqagacha bo'lishi va narxi noldan katta bo'lishi kerak.",
      );
      return false;
    }
    const body = {
      name,
      price,
      duration_minutes: duration,
      is_active: service.is_active,
      ...(scope === "salon"
        ? { salon: activeSalonId, barber: service.id ? (service.barber ?? null) : barberId }
        : {}),
    };
    const url =
      scope === "salon"
        ? service.id
          ? `/api/v1/services/${service.id}/`
          : "/api/v1/services/"
        : service.id
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
    } finally {
      setSavingServices(false);
    }
  };

  const addService = async (preset?: Recommendation["suggested_service"]) => {
    const draft = preset
      ? {
          name: preset.name,
          price: String(preset.price),
          duration_minutes: String(preset.duration_minutes),
          is_active: true,
        }
      : newService;
    setSavingServices(true);
    try {
      const ok = await saveService(draft);
      if (!ok) return;
      setNewService({ name: "", price: "", duration_minutes: "", is_active: true });
      toast.success("Xizmat qo'shildi.");
      await loadAll();
    } finally {
      setSavingServices(false);
    }
  };

  const deleteService = async (service: ServiceForm) => {
    if (!service.id || !canEditService(service)) return;
    const endpoint =
      scope === "salon"
        ? `/api/v1/services/${service.id}/`
        : `/api/v1/barber/services/${service.id}/`;
    const res = await apiFetch(endpoint, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await parseError(res, "Xizmatni o'chirib bo'lmadi."));
      return;
    }
    toast.success("Xizmat o'chirildi.");
    await loadAll();
  };

  const saveSchedule = async () => {
    if (scope === "salon" && !membershipId) {
      toast.error("Salon membership topilmadi. Avval salon bilan ulanishni yakunlang.");
      return;
    }
    setSavingSchedule(true);
    try {
      const breaksByDay: { day: DayForm; breaks: BreakItem[] }[] = [];
      for (const day of days) {
        try {
          breaksByDay.push({ day, breaks: parseBreaks(day.breaksText) });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Jadvalni tekshiring.");
          return;
        }
      }
      const base = scope === "salon" ? "/api/v1/schedules" : "/api/v1/barber/working-hours";
      const responses = await Promise.all(
        breaksByDay.map(({ day, breaks }) => {
          const body = {
            weekday: day.weekday,
            open_time: day.open_time,
            close_time: day.close_time,
            is_day_off: day.is_day_off,
            breaks,
            ...(scope === "salon" ? { membership: membershipId } : {}),
          };
          return apiFetch(day.id ? `${base}/${day.id}/` : `${base}/`, {
            method: day.id ? "PATCH" : "POST",
            body: JSON.stringify(body),
          });
        }),
      );
      for (const res of responses) {
        if (!res.ok) {
          toast.error(await parseError(res, "Jadvalni saqlab bo'lmadi."));
          void loadAll();
          return;
        }
      }
      toast.success("Ish jadvali saqlandi.");
      await loadAll();
    } finally {
      setSavingSchedule(false);
    }
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
      duration_minutes:
        rec.suggested_duration_minutes != null
          ? String(rec.suggested_duration_minutes)
          : svc.duration_minutes,
    };
    setSavingServices(true);
    try {
      const ok = await saveService(merged);
      if (!ok) return;
      toast.success("Tavsiya saqlandi.");
      await loadAll();
    } finally {
      setSavingServices(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    const raw = window.location.hash.replace(/^#/, "");
    if (raw === "activation-services" || raw === "activation-schedule") {
      window.requestAnimationFrame(() => {
        document.getElementById(raw)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [loading]);

  const blocker = useBlocker({
    shouldBlockFn: useCallback(() => {
      if (loading || savingServices || savingSchedule) return false;
      if (committedRef.current === null) return false;
      return serializeForm(services, days, newService) !== committedRef.current;
    }, [loading, savingServices, savingSchedule, services, days, newService]),
    withResolver: true,
    enableBeforeUnload: true,
    disabled: loading,
  });

  return (
    <>
      <div className="mx-auto max-w-[1180px] space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Xizmatlar va jadval"
          description={
            scope === "salon"
              ? "Salon ichidagi shaxsiy xizmatlaringiz va ish vaqtingiz user booking slotlarini boshqaradi."
              : "Mustaqil booking uchun ko'rinadigan xizmatlar, ish kunlari va tanaffuslarni shu yerda sozlang."
          }
          actions={
            <div className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              {scope === "salon" ? "Salon staff" : "Mustaqil barber"}
            </div>
          }
        />

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
                description={`${activeCount} ta faol xizmat. Narx va davomiylik booking vaqtini hisoblaydi.`}
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
                            "grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1.4fr)_120px_120px_90px_auto]",
                            !editable && "opacity-70",
                          )}
                        >
                          <input
                            value={service.name}
                            disabled={!editable}
                            onChange={(event) =>
                              setServices((prev) =>
                                prev.map((item) =>
                                  item.id === service.id
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
                          />
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
                          <input
                            type="number"
                            value={service.duration_minutes}
                            disabled={!editable}
                            onChange={(event) =>
                              setServices((prev) =>
                                prev.map((item) =>
                                  item.id === service.id
                                    ? { ...item, duration_minutes: event.target.value }
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
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() => void deleteService(service)}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-muted-foreground hover:text-destructive disabled:cursor-not-allowed"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                  <div className="grid gap-3 rounded-xl border border-dashed border-border p-3 sm:grid-cols-[minmax(0,1.4fr)_120px_120px_auto]">
                    <input
                      value={newService.name}
                      onChange={(event) =>
                        setNewService((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Yangi xizmat nomi"
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      value={newService.price}
                      onChange={(event) =>
                        setNewService((prev) => ({ ...prev, price: event.target.value }))
                      }
                      placeholder="Narx"
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      value={newService.duration_minutes}
                      onChange={(event) =>
                        setNewService((prev) => ({ ...prev, duration_minutes: event.target.value }))
                      }
                      placeholder="Daqiqa"
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => void addService()}
                      disabled={savingServices}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-3 text-sm font-medium text-background disabled:opacity-60"
                    >
                      <Plus className="size-4" />
                      Qo'shish
                    </button>
                  </div>
                </div>
              </SectionCard>
              </div>

              <div id="activation-schedule" className="scroll-mt-24">
              <SectionCard
                title="Ish jadvali"
                description="Dam olish kuni va tanaffuslar slotlarni avtomatik yopadi."
                actions={
                  <button
                    onClick={saveSchedule}
                    disabled={savingSchedule || (scope === "salon" && !membershipId)}
                    className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
                  >
                    {savingSchedule ? "Saqlanmoqda..." : "Jadvalni saqlash"}
                  </button>
                }
              >
                <div className="space-y-3">
                  {scope === "salon" && !membershipId ? (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
                      <p className="font-medium text-amber-950 dark:text-amber-100">
                        Ish jadvalini saqlash uchun salon a&apos;zoligi kerak
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Taklifni qabul qiling yoki salonga qo&apos;shiling — shundan keyin jadval
                        serverga yoziladi.
                      </p>
                      <Link
                        to={SIGNUP_FLOW_PATH.employee}
                        className="mt-2 inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:opacity-90"
                      >
                        Salonga qo&apos;shilish
                      </Link>
                    </div>
                  ) : null}
                  {days.map((day) => (
                    <div
                      key={day.weekday}
                      className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 md:grid-cols-[120px_105px_105px_minmax(0,1fr)_90px]"
                    >
                      <div className="flex items-center text-sm font-medium">
                        {WEEKDAYS[day.weekday]}
                      </div>
                      <input
                        type="time"
                        value={day.open_time}
                        disabled={day.is_day_off}
                        onChange={(event) =>
                          setDays((prev) =>
                            prev.map((item) =>
                              item.weekday === day.weekday
                                ? { ...item, open_time: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <input
                        type="time"
                        value={day.close_time}
                        disabled={day.is_day_off}
                        onChange={(event) =>
                          setDays((prev) =>
                            prev.map((item) =>
                              item.weekday === day.weekday
                                ? { ...item, close_time: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <input
                        value={day.breaksText}
                        disabled={day.is_day_off}
                        onChange={(event) =>
                          setDays((prev) =>
                            prev.map((item) =>
                              item.weekday === day.weekday
                                ? { ...item, breaksText: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="12:00-13:00, 16:00-16:15"
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDays((prev) =>
                            prev.map((item) =>
                              item.weekday === day.weekday
                                ? { ...item, is_day_off: !item.is_day_off }
                                : item,
                            ),
                          )
                        }
                        className={cn(
                          "h-10 rounded-lg border px-2 text-xs font-medium",
                          day.is_day_off
                            ? "border-border bg-background text-muted-foreground"
                            : "border-foreground bg-foreground text-background",
                        )}
                      >
                        {day.is_day_off ? "Dam" : "Ish"}
                      </button>
                    </div>
                  ))}
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

              <SectionCard title="Bookingga ta'siri">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <Clock className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Davomiylik tanlangan xizmatlar yig&apos;indisi bo&apos;yicha slot uzunligini
                      belgilaydi.
                    </p>
                  </div>
                  <p>
                    Faol bo'lmagan xizmatlar user app’da ko'rinmaydi. Dam olish kunlari va
                    tanaffuslar avtomatik yopiq slot sifatida qaytadi.
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
