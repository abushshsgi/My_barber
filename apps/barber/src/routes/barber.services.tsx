import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyBlock, PageHeader, SectionCard, StatusPill } from "@/components/barber/primitives";
import { useBarberContext } from "@/components/barber/BarberContext";
import { apiFetch, apiList, formatApiError } from "@/lib/api";
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

  const activeCount = useMemo(() => services.filter((item) => item.is_active).length, [services]);

  const loadAll = async () => {
    setLoading(true);
    try {
      if (scope === "salon") {
        const memberships = await apiList<Membership>(`/api/v1/memberships/?salon=${activeSalonId}`);
        const ownMembership = memberships.find((m) => m.barber === barberId) ?? null;
        setMembershipId(ownMembership?.id ?? null);
        const [serviceRows, scheduleRows, recs] = await Promise.all([
          apiList<ApiService>(`/api/v1/services/?salon=${activeSalonId}&barber=${barberId}`),
          ownMembership
            ? apiList<ApiWorkingHour>(`/api/v1/schedules/?membership=${ownMembership.id}`)
            : Promise.resolve([]),
          apiList<Recommendation>("/api/v1/barber/service-recommendations/"),
        ]);
        setServices(serviceRows.map(mapService));
        setDays(applyHours(scheduleRows));
        setRecommendations(recs);
      } else {
        const [serviceRows, scheduleRows, recs] = await Promise.all([
          apiList<ApiService>("/api/v1/barber/services/"),
          apiList<ApiWorkingHour>("/api/v1/barber/working-hours/"),
          apiList<Recommendation>("/api/v1/barber/service-recommendations/"),
        ]);
        setMembershipId(null);
        setServices(serviceRows.map(mapService));
        setDays(applyHours(scheduleRows));
        setRecommendations(recs);
      }
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
      toast.error("Duration 5-480 daqiqa, narx esa 0 dan katta bo'lishi kerak.");
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
      for (const service of services) {
        if (canEditService(service)) {
          const ok = await saveService(service);
          if (!ok) return;
        }
      }
      toast.success("Xizmatlar saqlandi.");
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
      scope === "salon" ? `/api/v1/services/${service.id}/` : `/api/v1/barber/services/${service.id}/`;
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
      for (const day of days) {
        const breaks = parseBreaks(day.breaksText);
        const body = {
          weekday: day.weekday,
          open_time: day.open_time,
          close_time: day.close_time,
          is_day_off: day.is_day_off,
          breaks,
          ...(scope === "salon" ? { membership: membershipId } : {}),
        };
        const base = scope === "salon" ? "/api/v1/schedules" : "/api/v1/barber/working-hours";
        const res = await apiFetch(day.id ? `${base}/${day.id}/` : `${base}/`, {
          method: day.id ? "PATCH" : "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          toast.error(await parseError(res, "Jadvalni saqlab bo'lmadi."));
          return;
        }
      }
      toast.success("Ish jadvali saqlandi.");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Jadvalni tekshiring.");
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
    setServices((prev) =>
      prev.map((service) =>
        service.id === String(rec.service_id)
          ? {
              ...service,
              price: rec.suggested_price ?? service.price,
              duration_minutes: rec.suggested_duration_minutes
                ? String(rec.suggested_duration_minutes)
                : service.duration_minutes,
            }
          : service,
      ),
    );
    toast.info("Tavsiya formaga qo'llandi. Saqlashni bosing.");
  };

  return (
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
            <SectionCard
              title="Xizmatlar"
              description={`${activeCount} ta faol xizmat. Narx va duration booking vaqtini hisoblaydi.`}
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
                                item.id === service.id ? { ...item, name: event.target.value } : item,
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
                                item.id === service.id ? { ...item, price: event.target.value } : item,
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
                                item.id === service.id ? { ...item, is_active: !item.is_active } : item,
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
                    onChange={(event) => setNewService((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Yangi xizmat nomi"
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="number"
                    value={newService.price}
                    onChange={(event) => setNewService((prev) => ({ ...prev, price: event.target.value }))}
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

            <SectionCard
              title="Ish jadvali"
              description="Dam olish kuni va tanaffuslar slotlarni avtomatik yopadi."
              actions={
                <button
                  onClick={saveSchedule}
                  disabled={savingSchedule}
                  className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
                >
                  {savingSchedule ? "Saqlanmoqda..." : "Jadvalni saqlash"}
                </button>
              }
            >
              <div className="space-y-3">
                {days.map((day) => (
                  <div
                    key={day.weekday}
                    className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 md:grid-cols-[120px_105px_105px_minmax(0,1fr)_90px]"
                  >
                    <div className="flex items-center text-sm font-medium">{WEEKDAYS[day.weekday]}</div>
                    <input
                      type="time"
                      value={day.open_time}
                      disabled={day.is_day_off}
                      onChange={(event) =>
                        setDays((prev) =>
                          prev.map((item) =>
                            item.weekday === day.weekday ? { ...item, open_time: event.target.value } : item,
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
                            item.weekday === day.weekday ? { ...item, close_time: event.target.value } : item,
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
                            item.weekday === day.weekday ? { ...item, breaksText: event.target.value } : item,
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

          <aside className="space-y-6">
            <SectionCard title="Tavsiyalar" description="Mavjud xizmat va bookinglardan rule-based maslahatlar.">
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
                  <p>Duration tanlangan xizmatlar yig'indisi bo'yicha slot uzunligini belgilaydi.</p>
                </div>
                <p>
                  Faol bo'lmagan xizmatlar user app’da ko'rinmaydi. Dam olish kunlari va tanaffuslar
                  avtomatik yopiq slot sifatida qaytadi.
                </p>
                {scope === "salon" && isJoinedWorker && (
                  <p>Salon-wide xizmatlar ko'rinishi mumkin, lekin siz faqat o'zingizga bog'langan xizmatlarni tahrirlaysiz.</p>
                )}
              </div>
            </SectionCard>
          </aside>
        </div>
      )}
    </div>
  );
}
