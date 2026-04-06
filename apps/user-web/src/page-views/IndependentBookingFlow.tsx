"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, getAccessToken } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { format } from "date-fns";
import type { BarberListApi } from "@/lib/barber-queries";

type Step = 1 | 2 | 3 | 4;

type BarberDetail = {
  id: number; // profile id
  barber_id: number;
  name: string;
  phone: string | null;
  avatar: string | null;
  location_text: string;
  services: { id: number; name: string; price: string; duration_minutes: number; is_active: boolean }[];
};

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
        // list doesn't have full services; we fetch by profile via /barbers/ then match by barber_id
        const resList = await apiFetch("/api/v1/barbers/");
        if (!resList.ok) throw new Error("Barber topilmadi");
        const j = (await resList.json()) as { results?: BarberListApi[] } | BarberListApi[];
        const list = Array.isArray(j) ? j : j.results || [];
        const row = list.find((x) => String(x.barber_id) === String(barberId));
        if (!row) throw new Error("Barber topilmadi");
        const res = await apiFetch(`/api/v1/barbers/${row.id}/`);
        if (!res.ok) throw new Error("Barber topilmadi");
        const detail = (await res.json()) as BarberDetail;
        if (!alive) return;
        setBarber(detail);
      } catch (e) {
        if (!alive) return;
        setErr((e as Error).message);
      } finally {
        if (!alive) return;
        setLoadingBarber(false);
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
        if (!alive) return;
        setLoadingSlots(false);
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
      router.push("/bookings");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBarber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
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
    <div className="min-h-screen bg-background">
      {me && !phoneOk && (
        <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span className="font-medium text-destructive">Telefon kerak. </span>
          Bron uchun profilda telefon kiriting.{" "}
          <Link href="/profile" className="font-semibold text-accent underline">
            Profil
          </Link>
        </div>
      )}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <img src={mediaSrc(barber.avatar, PLACEHOLDER_AVATAR)} alt={barber.name} className="w-10 h-10 rounded-2xl object-cover" />
          <div>
            <p className="font-bold text-sm">{barber.name}</p>
            <p className="text-xs text-muted-foreground">{barber.location_text || "—"}</p>
          </div>
        </div>
      </div>

      {err && (
        <div className="px-4 pb-2">
          <p className="text-sm text-destructive">{err}</p>
        </div>
      )}

      <div className="px-4 pb-4">
        <div className="flex gap-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-1.5 rounded-full",
                step >= s ? "bg-accent" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      <div className="px-4 pb-24">
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
                        "p-4 rounded-2xl border cursor-pointer transition-colors",
                        selected ? "border-accent/50 bg-accent/[0.06]" : "border-border/50 hover:bg-muted/40"
                      )}
                      onClick={() =>
                        setSelectedServices((prev) =>
                          prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                        )
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} daqiqa
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-accent">
                            {(parseFloat(s.price) || 0).toLocaleString()} so&apos;m
                          </span>
                          {selected && <Check className="h-5 w-5 text-accent" />}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              <Button
                className="w-full rounded-2xl gold-gradient text-gold-foreground border-0 h-12"
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
                className="rounded-2xl h-12"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Button className="w-full rounded-2xl h-12" onClick={() => setStep(3)}>
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
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
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
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={cn(
                          "h-10 rounded-xl border text-sm font-semibold transition-colors",
                          selectedTime === t
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border/50 hover:bg-muted/40"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <Button
                className="w-full rounded-2xl gold-gradient text-gold-foreground border-0 h-12"
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
              <Card className="p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Sana/vaqt</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate} {selectedTime}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-semibold">Jami</p>
                  <p className="text-sm font-bold text-accent">
                    {totalPrice.toLocaleString()} so&apos;m · {totalDuration} daqiqa
                  </p>
                </div>
              </Card>
              <Button
                className="w-full rounded-2xl gold-gradient text-gold-foreground border-0 h-12"
                disabled={submitting || !phoneOk}
                onClick={submit}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bron qilish"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

