"use client";

import { useState, useEffect } from "react";
import { Link, useParams, useRouter } from "@/navigation";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Scissors,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, formatApiError, getAccessToken } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { format } from "date-fns";
import { toast } from "sonner";
import { NeoPage } from "@/components/neo/NeoPrimitives";

type Step = 1 | 2 | 3 | 4;

type SalonDetail = {
  id: number;
  name: string;
  services: {
    id: number;
    barber: number | null;
    catalog_service: number | null;
    name: string;
    price: string;
    duration_minutes: number;
    image_url: string;
  }[];
};

type StaffMember = {
  id: number;
  full_name: string;
  avatar: string | null;
};

const STEP_META = [
  { id: 1, label: "Sartarosh", Icon: UserIcon },
  { id: 2, label: "Xizmat", Icon: Scissors },
  { id: 3, label: "Vaqt", Icon: CalendarIcon },
  { id: 4, label: "Tasdiq", Icon: CheckCircle2 },
] as const;

export default function BookingFlow() {
  const params = useParams();
  const router = useRouter();
  const salonId = params?.salonId as string;

  useEffect(() => {
    if (!salonId) return;
    if (!getAccessToken()) {
      router.replace(`/auth?next=${encodeURIComponent(`/booking/${salonId}`)}`);
    }
  }, [router, salonId]);

  const [step, setStep] = useState<Step>(1);
  const [selectedBarber, setSelectedBarber] = useState<number | null>(null);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: me } = useQuery({
    queryKey: ["me", "booking"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/users/me/");
      if (!res.ok) throw new Error("Profil");
      return res.json() as Promise<{ phone?: string | null }>;
    },
    enabled: !!getAccessToken(),
  });
  const phoneOk = !!(me?.phone && String(me.phone).trim());

  const { data: salon, isLoading, isError, error } = useQuery({
    queryKey: ["salon", salonId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/salons/${salonId}/`);
      if (!res.ok) throw new Error("Salon topilmadi");
      return res.json() as Promise<SalonDetail>;
    },
    enabled: !!salonId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", salonId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/salons/${salonId}/staff/`);
      if (!res.ok) return [];
      return res.json() as Promise<StaffMember[]>;
    },
    enabled: !!salonId,
  });

  const serviceIdsParam = selectedServices.join(",");
  const visibleServices = (salon?.services || []).filter(
    (service) => service.barber == null || service.barber === selectedBarber,
  );

  const { data: availability, isFetching: loadingSlots } = useQuery({
    queryKey: ["availability", salonId, selectedBarber, selectedDate, serviceIdsParam],
    queryFn: async () => {
      const params = new URLSearchParams({
        salon: String(salonId),
        barber: String(selectedBarber),
        date: selectedDate,
        service_ids: serviceIdsParam,
      });
      const res = await apiFetch(`/api/v1/bookings/availability/?${params}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(formatApiError(e, "Vaqt slotlari yuklanmadi"));
      }
      return res.json() as Promise<{ slots: string[] }>;
    },
    enabled: !!salonId && !!selectedBarber && selectedServices.length > 0 && step >= 3,
  });

  const timeSlots = availability?.slots ?? [];

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!salon || !selectedBarber || !selectedTime) throw new Error("missing");
      const [hh, mm] = selectedTime.split(":").map(Number);
      const [y, mo, d] = selectedDate.split("-").map(Number);
      const start = new Date(y, mo - 1, d, hh, mm, 0, 0);
      const body = {
        salon: salon.id,
        barber: selectedBarber,
        start_at: start.toISOString(),
        service_ids: selectedServices,
      };
      const res = await apiFetch("/api/v1/bookings/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(formatApiError(e, "Bron yuborilmadi"));
      }
      await res.json();
      return { barberId: selectedBarber };
    },
    onSuccess: async ({ barberId }) => {
      toast.success("Bron so‘rovi yuborildi", {
        description: "Sartarosh tasdiqlaguncha booking kutilmoqda holatida turadi.",
      });
      try {
        const cr = await apiFetch("/api/v1/chat/conversations/", {
          method: "POST",
          body: JSON.stringify({ barber_id: barberId }),
        });
        if (cr.ok) {
          const convo = (await cr.json()) as { id: string };
          router.push(`/chat/${convo.id}`);
          return;
        }
        const body = await cr.json().catch(() => ({}));
        toast.warning(formatApiError(body, "Chat keyinroq ochiladi"));
      } catch {
        toast.warning("Chat keyinroq ochiladi");
      }
      router.push("/bookings");
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !salon) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-center text-muted-foreground">
          {error instanceof Error ? error.message : "Salon topilmadi."}
        </p>
        <Button variant="outline" className="rounded-2xl" onClick={() => router.back()}>
          Orqaga
        </Button>
      </div>
    );
  }

  const totalDuration = visibleServices
    .filter((s) => selectedServices.includes(s.id))
    .reduce((a, s) => a + s.duration_minutes, 0);
  const totalPrice = visibleServices
    .filter((s) => selectedServices.includes(s.id))
    .reduce((a, s) => a + parseFloat(s.price), 0);

  const toggleService = (id: number) => {
    setSelectedTime(null);
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    bookingMutation.mutate();
  };

  const minDate = format(new Date(), "yyyy-MM-dd");

  const canAdvance =
    (step === 1 && !!selectedBarber) ||
    (step === 2 && selectedServices.length > 0) ||
    (step === 3 && !!selectedTime) ||
    step === 4;

  const stepperGo = (target: Step) => {
    if (target < step) {
      setStep(target);
      return;
    }
    if (target === 2 && selectedBarber) setStep(2);
    else if (target === 3 && selectedBarber && selectedServices.length > 0) setStep(3);
    else if (target === 4 && selectedBarber && selectedServices.length > 0 && selectedTime) setStep(4);
  };

  return (
    <NeoPage className="relative w-full pb-44">
      {me && !phoneOk && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-3 text-sm">
          <span className="font-medium text-destructive">Telefon kerak. </span>
          Bron uchun profilda telefon raqamingizni kiriting.{" "}
          <Link to="/profile" className="font-semibold text-foreground underline">
            Profilga oʻtish
          </Link>
        </div>
      )}

      {/* Header */}
      <header className="px-5 pt-safe">
        <div className="flex items-start gap-3 pt-3">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((step - 1) as Step) : router.back())}
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-lg border-2 border-border bg-surface shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow">{salon.name}</p>
            <h1 className="truncate text-[22px] font-extrabold tracking-tight text-foreground">
              Bron qilish
            </h1>
          </div>
        </div>

        {/* Booking Theatre — chain step indicator */}
        <div className="neo-panel mt-5 p-3">
          <div className="flex items-center gap-1">
            {STEP_META.map((s, idx) => {
              const isActive = step === s.id;
              const isDone = step > s.id;
              const Icon = s.Icon;
              return (
                <div key={s.id} className="contents">
                  <button
                    type="button"
                    onClick={() => stepperGo(s.id as Step)}
                    className={cn(
                      "group flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-1.5 outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                      isActive ? "bg-foreground/5" : "",
                    )}
                  >
                    <span
                      className={cn(
                        "relative grid h-9 w-9 place-items-center rounded-full border-2 transition",
                        isDone
                          ? "border-foreground bg-foreground text-background"
                          : isActive
                            ? "border-foreground bg-background text-foreground ring-4 ring-foreground/10"
                            : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span
                      className={cn(
                        "max-w-full truncate text-[10px] font-semibold",
                        isActive
                          ? "text-foreground"
                          : isDone
                            ? "text-foreground/70"
                            : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                  {idx < STEP_META.length - 1 && (
                    <span
                      className={cn(
                        "mt-4 h-[2px] w-3 shrink-0 rounded-full transition",
                        step > s.id ? "bg-foreground" : "bg-border",
                      )}
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Step content */}
      <div className="px-5 pt-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section
              key="s1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-2.5"
            >
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Sartarosh tanlang
              </h2>
              {staff.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                  <p className="text-sm font-semibold text-foreground">Sartaroshlar yoʻq</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bu salon uchun hozircha xodimlar roʻyxati boʻsh.
                  </p>
                </div>
              ) : (
                staff.map((barber) => {
                  const active = selectedBarber === barber.id;
                  return (
                    <button
                      type="button"
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarber(barber.id);
                        setSelectedServices([]);
                        setSelectedTime(null);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-3xl border bg-surface p-3.5 text-left shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-foreground ring-2 ring-foreground/20"
                          : "border-border hover:border-foreground/30",
                      )}
                    >
                      <img
                        src={mediaSrc(barber.avatar, PLACEHOLDER_AVATAR)}
                        alt=""
                        className={cn(
                          "h-14 w-14 rounded-2xl object-cover",
                          active && "ring-2 ring-gold/60",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{barber.full_name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          MyBarber sartaroshi
                        </p>
                      </div>
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full transition",
                          active ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {active ? <Check className="h-4 w-4" /> : <Sparkles className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })
              )}
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="s2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-2.5"
            >
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Xizmatlarni tanlang
              </h2>
              {visibleServices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                  <p className="text-sm font-semibold text-foreground">Faol xizmat yoʻq</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bu sartarosh uchun hozircha faol xizmat sozlanmagan.
                  </p>
                </div>
              ) : (
                visibleServices.map((service) => {
                  const active = selectedServices.includes(service.id);
                  return (
                    <button
                      type="button"
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={cn(
                        "group flex w-full cursor-pointer items-center gap-3 rounded-3xl border p-3 text-left shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-surface hover:border-foreground/30",
                      )}
                    >
                      <img
                        src={mediaSrc(service.image_url, PLACEHOLDER_AVATAR)}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-semibold">{service.name}</p>
                        <p
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 text-[11px]",
                            active ? "text-background/70" : "text-muted-foreground",
                          )}
                        >
                          <Clock className="h-3 w-3" /> {service.duration_minutes} daqiqa
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={cn("text-sm font-bold", active ? "text-background" : "text-foreground")}>
                          {parseFloat(service.price || "0").toLocaleString()} soʻm
                        </span>
                        <span
                          className={cn(
                            "grid h-6 w-6 place-items-center rounded-full transition",
                            active ? "bg-background/15 text-background" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {active ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="s3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-3"
            >
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Sana</h2>
              <input
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime(null);
                }}
                className="h-12 w-full cursor-pointer rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
              <h2 className="pt-2 text-sm font-semibold tracking-tight text-foreground">
                Boʻsh vaqt
              </h2>
              {loadingSlots ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                  <p className="text-sm font-semibold text-foreground">Boʻsh vaqt yoʻq</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Boshqa kun tanlang yoki sartarosh ish jadvalini kuting.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTime(t)}
                      className={cn(
                        "h-11 cursor-pointer rounded-2xl border text-sm font-bold tabular-nums outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                        selectedTime === t
                          ? "border-foreground bg-foreground text-background shadow-soft"
                          : "border-border bg-surface text-foreground hover:border-foreground/30",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {step === 4 && (
            <motion.section
              key="s4"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-3"
            >
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Tasdiqlash
              </h2>
              <div className="rounded-3xl border border-border bg-surface p-4 shadow-card">
                <Row label="Salon" value={salon.name} />
                <Row
                  label="Sartarosh"
                  value={staff.find((s) => s.id === selectedBarber)?.full_name || "—"}
                />
                <Row label="Sana" value={format(new Date(selectedDate), "d MMMM yyyy")} />
                <Row label="Vaqt" value={selectedTime || "—"} />
                <Row label="Xizmatlar" value={`${selectedServices.length} ta`} />
                <Row label="Davomiyligi" value={`${totalDuration} daq.`} />
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold text-foreground">Jami</span>
                  <span className="font-display text-xl font-bold text-foreground">
                    {totalPrice.toLocaleString()} soʻm
                  </span>
                </div>
              </div>
              {bookingMutation.isError && (
                <p className="text-center text-sm text-destructive">
                  {(bookingMutation.error as Error).message}
                </p>
              )}
              {bookingMutation.isSuccess && (
                <div className="rounded-2xl border border-success/30 bg-success/5 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    Bron yuborildi!
                  </p>
                  <p className="text-xs text-muted-foreground">Yoʻnaltirilmoqda…</p>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Summary Pill */}
      <motion.div
        layout
        className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="pointer-events-auto w-full max-w-md">
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="glass-pill flex items-center gap-3 rounded-full border border-border px-4 py-2 shadow-luxury"
          >
            <div className="min-w-0 flex-1">
              {selectedServices.length > 0 ? (
                <>
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {selectedServices.length} xizmat · {totalDuration} daq
                  </p>
                  <p className="truncate font-display text-base font-bold text-foreground">
                    {totalPrice.toLocaleString()} soʻm
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Booking
                  </p>
                  <p className="truncate text-sm font-bold text-foreground">{salon.name}</p>
                </>
              )}
            </div>
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => canAdvance && setStep((Math.min(4, step + 1) as Step))}
                disabled={!canAdvance}
                className="h-11 cursor-pointer rounded-full bg-foreground px-5 text-[13px] font-bold text-background shadow-soft hover:bg-foreground/90"
              >
                Davom etish
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={bookingMutation.isPending || bookingMutation.isSuccess || !phoneOk}
                className="h-11 cursor-pointer rounded-full bg-foreground px-5 text-[13px] font-bold text-background shadow-soft hover:bg-foreground/90"
              >
                {bookingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Bron qilish"
                )}
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </NeoPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
