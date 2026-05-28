"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useRouter } from "@/navigation";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Scissors,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, formatApiError, getAccessToken } from "@/lib/api";
import {
  fetchBarberPublicDetailByBarberId,
  type BarberPublicDetailApi,
} from "@/lib/barber-queries";
import { useQuery } from "@tanstack/react-query";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { format } from "date-fns";
import { toast } from "sonner";
import { NeoPage } from "@/components/neo/NeoPrimitives";

type Step = 1 | 2 | 3 | 4;

type BarberDetail = BarberPublicDetailApi;

const STEP_META = [
  { id: 1, label: "Profil", Icon: UserIcon },
  { id: 2, label: "Xizmat", Icon: Scissors },
  { id: 3, label: "Vaqt", Icon: CalendarIcon },
  { id: 4, label: "Tasdiq", Icon: CheckCircle2 },
] as const;

export default function IndependentBookingFlow() {
  const params = useParams();
  const router = useRouter();
  const barberId = params?.barberId as string;

  useEffect(() => {
    if (!barberId) return;
    if (!getAccessToken()) {
      router.replace(`/auth?next=${encodeURIComponent(`/booking/barber/${barberId}`)}`);
    }
  }, [router, barberId]);

  const [step, setStep] = useState<Step>(1);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const [barber, setBarber] = useState<BarberDetail | null>(null);
  const [loadingBarber, setLoadingBarber] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingBarber(true);
      setErr(null);
      try {
        const detail = await fetchBarberPublicDetailByBarberId(barberId);
        if (!alive) return;
        setBarber(detail);
      } catch (e) {
        if (!alive) return;
        setErr((e as Error).message);
      } finally {
        if (alive) setLoadingBarber(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [barberId]);

  const activeServices = useMemo(
    () => (barber?.services || []).filter((s) => s.is_active),
    [barber],
  );

  const totalDuration = useMemo(() => {
    const map = new Map(activeServices.map((s) => [s.id, s]));
    return selectedServices.reduce((sum, id) => sum + (map.get(id)?.duration_minutes || 0), 0);
  }, [activeServices, selectedServices]);

  const totalPrice = useMemo(() => {
    const map = new Map(activeServices.map((s) => [s.id, s]));
    return selectedServices.reduce(
      (sum, id) => sum + (parseFloat(map.get(id)?.price || "0") || 0),
      0,
    );
  }, [activeServices, selectedServices]);

  const serviceIdsParam = selectedServices.join(",");

  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!barberId) return;
    if (!serviceIdsParam) return;
    let alive = true;
    (async () => {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams({
          barber: String(barberId),
          date: selectedDate,
          barber_service_ids: serviceIdsParam,
        });
        const res = await apiFetch(`/api/v1/barbers/availability/?${params}`);
        const j = (await res.json().catch(() => ({}))) as { slots?: string[] };
        if (!alive) return;
        if (!res.ok) {
          setSlots([]);
          return;
        }
        setSlots(j.slots || []);
      } finally {
        if (alive) setLoadingSlots(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [barberId, selectedDate, serviceIdsParam]);

  const createBooking = async () => {
    if (!barberId || !selectedTime || selectedServices.length === 0) throw new Error("missing");
    const [hh, mm] = selectedTime.split(":").map(Number);
    const [y, mo, d] = selectedDate.split("-").map(Number);
    const startAt = new Date(y, mo - 1, d, hh, mm, 0, 0).toISOString();
    const res = await apiFetch("/api/v1/bookings/", {
      method: "POST",
      body: JSON.stringify({
        barber: Number(barberId),
        start_at: startAt,
        barber_service_ids: selectedServices,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatApiError(data, "Bron yaratilmadi"));
  };

  const { data: me } = useQuery({
    queryKey: ["me", "indep-booking"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/users/me/");
      if (!res.ok) throw new Error("Profil");
      return res.json() as Promise<{ phone?: string | null }>;
    },
    enabled: !!getAccessToken(),
  });
  const phoneOk = !!(me?.phone && String(me.phone).trim());

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submit = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      await createBooking();
      setSubmitted(true);
      toast.success("Bron soʻrovi yuborildi", {
        description: "Sartarosh tasdiqlaguncha booking kutilmoqda holatida turadi.",
      });
      try {
        const cr = await apiFetch("/api/v1/chat/conversations/", {
          method: "POST",
          body: JSON.stringify({ barber_id: Number(barberId) }),
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
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBarber) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (err && !barber) {
    return (
      <div className="min-h-screen p-6 text-center text-destructive">{err}</div>
    );
  }

  if (!barber) return null;

  const canAdvance =
    step === 1 ||
    (step === 2 && selectedServices.length > 0) ||
    (step === 3 && !!selectedTime) ||
    step === 4;

  const stepperGo = (target: Step) => {
    if (target < step) {
      setStep(target);
      return;
    }
    if (target === 2) setStep(2);
    else if (target === 3 && selectedServices.length > 0) setStep(3);
    else if (target === 4 && selectedServices.length > 0 && selectedTime) setStep(4);
  };

  const minDate = format(new Date(), "yyyy-MM-dd");

  return (
    <NeoPage className="relative w-full pb-44">
      {me && !phoneOk && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-3 text-sm">
          <span className="font-medium text-destructive">Telefon kerak. </span>
          Bron uchun profilda telefon kiriting.{" "}
          <Link to="/profile" className="font-semibold text-foreground underline">
            Profil
          </Link>
        </div>
      )}

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
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <img
              src={mediaSrc(barber.avatar, PLACEHOLDER_AVATAR)}
              alt=""
              className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-gold/40"
            />
            <div className="min-w-0">
              <p className="label-eyebrow truncate">Mustaqil sartarosh</p>
              <h1 className="truncate text-[18px] font-extrabold tracking-tight text-foreground">
                {barber.name}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {barber.location_text || "—"}
              </p>
            </div>
          </div>
        </div>

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

      <div className="px-5 pt-6">
        {err && (
          <p className="mb-3 text-sm text-destructive">{err}</p>
        )}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section
              key="s1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-3"
            >
              <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <img
                    src={mediaSrc(barber.avatar, PLACEHOLDER_AVATAR)}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-gold/40"
                  />
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      {barber.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {barber.location_text || "Mustaqil sartarosh"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/85">
                  Mustaqil sartarosh bilan band qilish uchun avval xizmatlarni tanlaysiz, soʻngra qulay vaqtni belgilaysiz.
                </p>
              </div>
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
              {activeServices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                  <p className="text-sm font-semibold text-foreground">Faol xizmat yoʻq</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sartarosh hali xizmat sozlamagan.
                  </p>
                </div>
              ) : (
                activeServices.map((s) => {
                  const active = selectedServices.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() =>
                        setSelectedServices((prev) =>
                          prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                        )
                      }
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-3xl border p-3 text-left shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-surface hover:border-foreground/30",
                      )}
                    >
                      <img
                        src={mediaSrc(s.image_url, PLACEHOLDER_AVATAR)}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-semibold">{s.name}</p>
                        <p
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 text-[11px]",
                            active ? "text-background/70" : "text-muted-foreground",
                          )}
                        >
                          <Clock className="h-3 w-3" /> {s.duration_minutes} daqiqa
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={cn("text-sm font-bold", active ? "text-background" : "text-foreground")}>
                          {(parseFloat(s.price) || 0).toLocaleString()} soʻm
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
              ) : slots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                  <p className="text-sm font-semibold text-foreground">Boʻsh vaqt yoʻq</p>
                  <p className="mt-1 text-xs text-muted-foreground">Boshqa kun tanlang.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((t) => (
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
                <Row label="Sartarosh" value={barber.name} />
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
              {submitted && (
                <div className="rounded-2xl border border-success/30 bg-success/5 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
                  <p className="mt-2 text-sm font-semibold text-foreground">Bron yuborildi!</p>
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
                  <p className="truncate text-sm font-bold text-foreground">{barber.name}</p>
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
                onClick={submit}
                disabled={submitting || submitted || !phoneOk}
                className="h-11 cursor-pointer rounded-full bg-foreground px-5 text-[13px] font-bold text-background shadow-soft hover:bg-foreground/90"
              >
                {submitting ? (
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
