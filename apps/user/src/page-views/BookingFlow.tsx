"use client";

import { useState, useEffect } from "react";
import { Link, useParams, useRouter } from "@/navigation";
import { ArrowLeft, Check, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, formatApiError, getAccessToken } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { format } from "date-fns";
import { toast } from "sonner";

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

  const totalDuration = visibleServices
    .filter((s) => selectedServices.includes(s.id))
    .reduce((a, s) => a + s.duration_minutes, 0);
  const totalPrice = visibleServices
    .filter((s) => selectedServices.includes(s.id))
    .reduce((a, s) => a + parseFloat(s.price), 0);

  const toggleService = (id: number) => {
    setSelectedTime(null);
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
    <div className="mx-auto min-h-screen w-full max-w-md bg-background pb-32 pt-safe">
      {me && !phoneOk && (
        <div className="border-b border-destructive/30 bg-destructive/5 px-5 py-3 text-sm text-foreground">
          <span className="font-medium text-destructive">Telefon kerak. </span>
          Bron uchun profilda telefon raqamingizni kiriting.{" "}
          <Link to="/profile" className="font-semibold text-foreground underline">
            Profilga o‘tish
          </Link>
        </div>
      )}
      <header className="flex items-start gap-3 px-5 pt-4">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep((step - 1) as Step) : router.back())}
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-surface outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="label-eyebrow">{salon.name}</p>
          <h1 className="truncate text-lg font-bold text-foreground">{stepTitles[step - 1]}</h1>
        </div>
        <span className="mt-7 text-xs font-semibold tabular-nums text-muted-foreground">
          {step}/4
        </span>
      </header>

      <div className="mx-5 mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <div className="px-5 pb-28 pt-6">
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
                    "flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedBarber === barber.id ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/30",
                  )}
                  onClick={() => {
                    setSelectedBarber(barber.id);
                    setSelectedServices([]);
                    setSelectedTime(null);
                  }}
                >
                  <img
                    src={mediaSrc(barber.avatar, PLACEHOLDER_AVATAR)}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{barber.full_name}</p>
                  </div>
                  {selectedBarber === barber.id && <Check className="h-5 w-5 shrink-0 text-foreground" />}
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
                className="mt-4 h-12 w-full cursor-pointer rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-luxury focus-visible:ring-2 focus-visible:ring-ring"
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
              {visibleServices.map((service) => (
                <Card
                  key={service.id}
                  className={cn(
                    "cursor-pointer rounded-2xl border border-border bg-surface p-3 shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedServices.includes(service.id)
                      ? "border-foreground bg-foreground text-background ring-1 ring-foreground"
                      : "hover:border-foreground/30",
                  )}
                  onClick={() => toggleService(service.id)}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={mediaSrc(service.image_url, PLACEHOLDER_AVATAR)}
                      alt=""
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p
                        className={
                          "mt-1 flex items-center gap-1 text-xs " +
                          (selectedServices.includes(service.id)
                            ? "text-background/70"
                            : "text-muted-foreground")
                        }
                      >
                        <Clock className="h-3 w-3" /> {service.duration_minutes} daq
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={"font-semibold " + (selectedServices.includes(service.id) ? "text-background" : "text-foreground")}>
                      {parseFloat(service.price).toLocaleString()}
                    </span>
                    {selectedServices.includes(service.id) && (
                      <Check className="h-5 w-5 shrink-0 text-background" />
                    )}
                  </div>
                </Card>
              ))}
              {visibleServices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Bu sartarosh uchun hozircha faol xizmat yo&apos;q.
                </p>
              )}
              {selectedServices.length > 0 && (
                <Card className="rounded-2xl border border-border bg-muted/40 p-3">
                  <div className="flex justify-between text-sm">
                    <span>
                      Jami vaqt: <strong>{totalDuration} daq</strong>
                    </span>
                    <span>
                      Narx: <strong>{totalPrice.toLocaleString()} so&apos;m</strong>
                    </span>
                  </div>
                </Card>
              )}
              <Button
                disabled={selectedServices.length === 0}
                onClick={() => setStep(3)}
                className="mt-2 h-12 w-full cursor-pointer rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-luxury focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="h-11 w-full cursor-pointer rounded-2xl border border-border bg-surface px-3 text-sm font-medium outline-none shadow-soft transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {loadingSlots && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                        "cursor-pointer rounded-2xl border py-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                        selectedTime === t
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-surface hover:border-foreground/30",
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
                className="mt-4 h-12 w-full cursor-pointer rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-luxury focus-visible:ring-2 focus-visible:ring-ring"
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
              <Card className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm shadow-soft">
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
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleConfirm}
                    disabled={!phoneOk}
                    className="h-12 w-full cursor-pointer rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-luxury focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Bronni yuborish
                  </Button>
                </motion.div>
              )}
              {bookingMutation.isPending && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Kutilmoqda...</p>
                </div>
              )}
              {bookingMutation.isSuccess && (
                <div className="text-center py-8 space-y-4">
                  <motion.p
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-lg font-semibold text-foreground"
                  >
                    Bron yuborildi!
                  </motion.p>
                  <p className="text-sm text-muted-foreground">Yo‘naltirilmoqda…</p>
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
