"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useRouter } from "@/navigation";
import { ArrowLeft, Check, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, getAccessToken } from "@/lib/api";
import {
  fetchBarberPublicDetailByBarberId,
  type BarberPublicDetailApi,
} from "@/lib/barber-queries";
import { useQuery } from "@tanstack/react-query";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3 | 4;

type BarberDetail = BarberPublicDetailApi;

export default function IndependentBookingFlow() {
  const params = useParams();
  const router = useRouter();
  const barberId = params?.barberId as string; // barber PK

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
        if (alive) {
          setLoadingBarber(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [barberId]);

  const activeServices = useMemo(
    () => (barber?.services || []).filter((s) => s.is_active),
    [barber]
  );

  const totalDuration = useMemo(() => {
    const map = new Map(activeServices.map((s) => [s.id, s]));
    return selectedServices.reduce((sum, id) => sum + (map.get(id)?.duration_minutes || 0), 0);
  }, [activeServices, selectedServices]);

  const totalPrice = useMemo(() => {
    const map = new Map(activeServices.map((s) => [s.id, s]));
    return selectedServices.reduce((sum, id) => sum + (parseFloat(map.get(id)?.price || "0") || 0), 0);
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
        if (alive) {
          setLoadingSlots(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [barberId, selectedDate, serviceIdsParam]);

  const createBooking = async () => {
    if (!barberId || !selectedTime || selectedServices.length === 0) throw new Error("missing");
    const startAt = `${selectedDate}T${selectedTime}:00`;
    const res = await apiFetch("/api/v1/bookings/", {
      method: "POST",
      body: JSON.stringify({
        barber: Number(barberId),
        start_at: startAt,
        barber_service_ids: selectedServices,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { detail?: string }).detail || "Bron yaratilmadi");
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
  const submit = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      await createBooking();
      toast({
        title: "Bron tasdiqlandi",
        description: "Sartaroshga xabar ketdi. Chatdan yozishingiz mumkin.",
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
      } catch {
        /* chat ixtiyoriy */
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
      <div className="min-h-screen p-6 text-center text-destructive">
        {err}
      </div>
    );
  }

  if (!barber) return null;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background pb-32 pt-safe">
      {me && !phoneOk && (
        <div className="border-b border-destructive/30 bg-destructive/5 px-5 py-3 text-sm">
          <span className="font-medium text-destructive">Telefon kerak. </span>
          Bron uchun profilda telefon kiriting.{" "}
          <Link to="/profile" className="font-semibold text-foreground underline">
            Profil
          </Link>
        </div>
      )}
      <header className="flex items-start gap-3 px-5 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-surface outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <img
            src={mediaSrc(barber.avatar, PLACEHOLDER_AVATAR)}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <p className="label-eyebrow">Mustaqil sartarosh</p>
            <h1 className="truncate text-base font-bold text-foreground">{barber.name}</h1>
            <p className="truncate text-xs text-muted-foreground">{barber.location_text || "—"}</p>
          </div>
        </div>
        <span className="mt-7 text-xs font-semibold tabular-nums text-muted-foreground">{step}/4</span>
      </header>

      <div className="mx-5 mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      {err && (
        <div className="px-5 pb-2 pt-2">
          <p className="text-sm text-destructive">{err}</p>
        </div>
      )}

      <div className="px-5 pb-28 pt-6">
        <AnimatePresence mode="popLayout">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <h2 className="text-base font-semibold">Xizmatlarni tanlang</h2>
              <div className="space-y-2">
                {activeServices.map((s) => {
                  const selected = selectedServices.includes(s.id);
                  return (
                    <Card
                      key={s.id}
                      className={cn(
                        "cursor-pointer rounded-2xl border border-border bg-surface p-4 shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-foreground bg-foreground text-background ring-1 ring-foreground"
                          : "hover:border-foreground/30",
                      )}
                      onClick={() =>
                        setSelectedServices((prev) =>
                          prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                        )
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{s.name}</p>
                          <p
                            className={cn(
                              "mt-1 flex items-center gap-1 text-xs",
                              selected ? "text-background/75" : "text-muted-foreground",
                            )}
                          >
                            <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} daqiqa
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-bold",
                              selected ? "text-background" : "text-foreground",
                            )}
                          >
                            {(parseFloat(s.price) || 0).toLocaleString()} so&apos;m
                          </span>
                          {selected ? <Check className="h-5 w-5 text-background" /> : null}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              <Button
                className="h-12 w-full cursor-pointer rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-luxury focus-visible:ring-2 focus-visible:ring-ring"
                disabled={selectedServices.length === 0}
                onClick={() => setStep(2)}
              >
                Davom etish
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <h2 className="text-base font-semibold">Sana tanlang</h2>
              <Input
                type="date"
                className="h-11 w-full cursor-pointer rounded-2xl border border-border bg-surface px-3 text-sm font-medium shadow-soft focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Button
                className="h-12 w-full cursor-pointer rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-luxury focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setStep(3)}
              >
                Vaqt tanlash
              </Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <h2 className="text-base font-semibold">Vaqt tanlang</h2>
              {loadingSlots && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loadingSlots && (
                <>
                  {slots.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Bu kun uchun bo&apos;sh vaqt yo&apos;q.
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((t) => (
                      <motion.button
                        key={t}
                        type="button"
                        layout
                        whileTap={{ scale: 0.96 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedTime(t)}
                        className={cn(
                          "h-10 rounded-2xl border text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                          selectedTime === t
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-surface hover:border-foreground/30",
                        )}
                      >
                        {t}
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
              <Button
                className="h-12 w-full cursor-pointer rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-luxury focus-visible:ring-2 focus-visible:ring-ring"
                disabled={!selectedTime}
                onClick={() => setStep(4)}
              >
                Tasdiqlash
              </Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <h2 className="text-base font-semibold">Tasdiqlash</h2>
              <Card className="space-y-2 rounded-2xl border border-border bg-surface p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Sana/vaqt</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate} {selectedTime}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Jami</p>
                  <p className="text-sm font-bold text-foreground">
                    {totalPrice.toLocaleString()} so&apos;m · {totalDuration} daqiqa
                  </p>
                </div>
              </Card>
              <motion.div whileTap={{ scale: submitting ? 1 : 0.98 }}>
                <Button
                  className="h-12 w-full cursor-pointer rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-luxury focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={submitting || !phoneOk}
                  onClick={submit}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                  ) : (
                    "Bron qilish"
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

