"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, formatApiError, getAccessToken } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { format } from "date-fns";

type Step = 1 | 2 | 3 | 4;

type SalonDetail = {
  id: number;
  name: string;
  services: { id: number; name: string; price: string; duration_minutes: number }[];
};

type StaffMember = {
  id: number;
  full_name: string;
  avatar: string | null;
};

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
    enabled:
      !!salonId &&
      !!selectedBarber &&
      selectedServices.length > 0 &&
      step >= 3,
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
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isError || !salon) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-muted-foreground text-center">
          {error instanceof Error ? error.message : "Salon topilmadi."}
        </p>
        <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
          Orqaga
        </Button>
      </div>
    );
  }

  const totalDuration = salon.services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((a, s) => a + s.duration_minutes, 0);
  const totalPrice = salon.services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((a, s) => a + parseFloat(s.price), 0);

  const toggleService = (id: number) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    bookingMutation.mutate();
  };

  const stepTitles = ["Sartarosh tanlang", "Xizmatlarni tanlang", "Vaqt tanlang", "Tasdiqlash"];

  const minDate = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-background">
      {me && !phoneOk && (
        <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground">
          <span className="text-destructive font-medium">Telefon kerak. </span>
          Bron uchun profilda telefon raqamingizni kiriting.{" "}
          <Link href="/profile" className="font-semibold text-accent underline">
            Profilga o‘tish
          </Link>
        </div>
      )}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((step - 1) as Step) : router.back())}
            className="p-1"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-semibold text-foreground">{salon.name}</h1>
            <p className="text-xs text-muted-foreground">{stepTitles[step - 1]}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                s <= step ? "bg-accent" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {staff.map((barber) => (
                <Card
                  key={barber.id}
                  className={cn(
                    "p-4 flex items-center gap-3 cursor-pointer transition-all",
                    selectedBarber === barber.id ? "ring-2 ring-accent" : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedBarber(barber.id)}
                >
                  <img
                    src={mediaSrc(barber.avatar, PLACEHOLDER_AVATAR)}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{barber.full_name}</p>
                  </div>
                  {selectedBarber === barber.id && <Check className="h-5 w-5 text-accent" />}
                </Card>
              ))}
              {staff.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Hozircha sartaroshlar ro&apos;yxati bo&apos;sh.
                </p>
              )}
              <Button
                disabled={!selectedBarber}
                onClick={() => setStep(2)}
                className="w-full h-11 rounded-xl gold-gradient text-gold-foreground border-0 mt-4"
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
              {salon.services.map((service) => (
                <Card
                  key={service.id}
                  className={cn(
                    "p-4 flex items-center justify-between cursor-pointer transition-all",
                    selectedServices.includes(service.id)
                      ? "ring-2 ring-accent"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => toggleService(service.id)}
                >
                  <div>
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {service.duration_minutes} daq
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-accent">
                      {parseFloat(service.price).toLocaleString()}
                    </span>
                    {selectedServices.includes(service.id) && (
                      <Check className="h-5 w-5 text-accent" />
                    )}
                  </div>
                </Card>
              ))}
              {selectedServices.length > 0 && (
                <Card className="p-3 bg-accent/10 border-accent/20">
                  <div className="flex justify-between text-sm">
                    <span>
                      Jami vaqt: <strong>{totalDuration} daq</strong>
                    </span>
                    <span>
                      Narx:{" "}
                      <strong className="text-accent">{totalPrice.toLocaleString()} so&apos;m</strong>
                    </span>
                  </div>
                </Card>
              )}
              <Button
                disabled={selectedServices.length === 0}
                onClick={() => setStep(3)}
                className="w-full h-11 rounded-xl gold-gradient text-gold-foreground border-0 mt-2"
              >
                Davom etish
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
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sana</label>
                <input
                  type="date"
                  min={minDate}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime(null);
                  }}
                  className="w-full h-11 px-3 rounded-xl border bg-background text-sm"
                />
              </div>
              {loadingSlots && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              )}
              {!loadingSlots && (
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTime(t)}
                      className={cn(
                        "py-3 rounded-xl text-sm font-medium border transition-all",
                        selectedTime === t
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-muted/50 border-transparent hover:bg-muted"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {!loadingSlots && timeSlots.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-4">
                  Bu kun uchun bo&apos;sh vaqt yo&apos;q yoki salon yopiq.
                </p>
              )}
              <Button
                disabled={!selectedTime}
                onClick={() => setStep(4)}
                className="w-full h-11 rounded-xl gold-gradient text-gold-foreground border-0 mt-4"
              >
                Davom etish
              </Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <Card className="p-4 space-y-2 text-sm">
                <p>
                  <strong>Sana:</strong> {selectedDate}
                </p>
                <p>
                  <strong>Vaqt:</strong> {selectedTime}
                </p>
                <p>
                  <strong>Xizmatlar:</strong> {selectedServices.length} ta
                </p>
                <p>
                  <strong>Jami:</strong> {totalPrice.toLocaleString()} so&apos;m
                </p>
              </Card>
              {!bookingMutation.isPending && !bookingMutation.isSuccess && (
                <Button
                  onClick={handleConfirm}
                  disabled={!phoneOk}
                  className="w-full h-12 rounded-xl gold-gradient text-gold-foreground border-0"
                >
                  Bronni yuborish
                </Button>
              )}
              {bookingMutation.isPending && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <Loader2 className="h-10 w-10 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">Kutilmoqda...</p>
                </div>
              )}
              {bookingMutation.isSuccess && (
                <div className="text-center py-8 space-y-4">
                  <p className="text-lg font-semibold text-accent">Bron yuborildi!</p>
                  <Button variant="outline" onClick={() => router.push("/bookings")}>
                    Mening bronlarim
                  </Button>
                </div>
              )}
              {bookingMutation.isError && (
                <p className="text-sm text-destructive text-center px-2">
                  {(bookingMutation.error as Error).message}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
