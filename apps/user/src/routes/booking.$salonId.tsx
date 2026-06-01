import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Star, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { salons, formatPrice } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { RadialStepIndicator } from "@/components/luxury/RadialStepIndicator";
import { FloatingSummaryPill } from "@/components/luxury/FloatingSummaryPill";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking/$salonId")({
  head: () => ({ meta: [{ title: "Band qilish — mysaloon.uz" }] }),
  component: BookingFlow,
});

const DAYS = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan", "Yak"];
const SLOTS = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15",
  "10:30", "10:45", "11:00", "11:15", "11:30", "11:45",
  "12:00", "12:15", "14:00", "14:15", "14:30", "14:45",
];

function BookingFlow() {
  const { t } = useTranslation();
  const { salonId } = useParams({ from: "/booking/$salonId" });
  const router = useRouter();
  const reduce = useReducedMotion();
  const salon = salons.find((s) => s.id === salonId) ?? salons[0];

  const [step, setStep] = useState(1);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);

  const stepLabels = [
    t("booking.step1") as string,
    t("booking.step2") as string,
    t("booking.step3") as string,
    t("booking.step4") as string,
  ];
  const canAdvance =
    (step === 1 && barberId) ||
    (step === 2 && serviceIds.length > 0) ||
    (step === 3 && slot) ||
    step === 4;

  const selectedServices = useMemo(
    () => salon.services.filter((s) => serviceIds.includes(s.id)),
    [salon.services, serviceIds],
  );
  const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const selectedBarber = salon.staff.find((b) => b.id === barberId);

  const today = new Date();
  const dayList = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return { date: d.getDate(), day: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] };
  });

  const handleSubmit = () => {
    toast.success("Bron so'rovi yuborildi!", {
      description: `${salon.name} · ${slot}`,
    });
    setTimeout(() => router.navigate({ to: "/bookings" }), 700);
  };

  return (
    <div>
      <PageHeader showBack title={t("booking.title")} />

      <div className="px-5 pt-2">
        <RadialStepIndicator steps={stepLabels} current={step} />
      </div>

      <div className="px-5 pt-6 pb-44">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={reduce ? undefined : { opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -14 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 1 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                  Salon
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {t("booking.selectBarber")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{salon.name}</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {salon.staff.map((b) => {
                    const sel = barberId === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setBarberId(b.id)}
                        className={cn(
                          "rounded-3xl border bg-card p-4 text-left transition-all shadow-soft",
                          sel
                            ? "border-gold ring-2 ring-gold/30"
                            : "border-border hover:border-foreground/20",
                        )}
                      >
                        <div className="relative">
                          <div className="grid h-14 w-14 place-items-center rounded-full bg-onyx text-base font-bold text-ivory ring-2 ring-gold/30">
                            {b.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          {sel && (
                            <span className="absolute -right-1 -bottom-1 grid h-6 w-6 place-items-center rounded-full bg-gold text-onyx ring-2 ring-card">
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm font-bold">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.role}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-bold">
                          <Star className="h-3 w-3 fill-gold text-gold" strokeWidth={0} />
                          {b.rating}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                  {selectedBarber?.name}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {t("booking.selectService")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bir nechta xizmatni birgalikda tanlay olasiz
                </p>
                <div className="mt-6 space-y-2">
                  {salon.services.map((s) => {
                    const sel = serviceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() =>
                          setServiceIds((prev) =>
                            prev.includes(s.id)
                              ? prev.filter((x) => x !== s.id)
                              : [...prev, s.id],
                          )
                        }
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all",
                          sel
                            ? "border-gold bg-surface shadow-soft"
                            : "border-border bg-card hover:border-foreground/20",
                        )}
                      >
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold">{s.name}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {s.duration} {t("salon.minutes")} ·{" "}
                            <span className="text-foreground font-bold">
                              {formatPrice(s.price)}
                            </span>
                          </p>
                        </div>
                        <div
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors",
                            sel ? "border-gold bg-gold" : "border-border",
                          )}
                        >
                          {sel && (
                            <Check className="h-3.5 w-3.5 text-onyx" strokeWidth={3} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                  Vaqt jadvali
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {t("booking.selectTime")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mavjud bo'sh vaqtlardan tanlang
                </p>

                <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
                  {dayList.map((d, i) => {
                    const sel = dayIdx === i;
                    return (
                      <button
                        key={i}
                        onClick={() => setDayIdx(i)}
                        className={cn(
                          "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl transition-all",
                          sel
                            ? "bg-onyx text-ivory shadow-soft"
                            : "border border-border bg-card text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            sel ? "text-gold" : "opacity-60",
                          )}
                        >
                          {d.day}
                        </span>
                        <span className="text-lg font-bold">{d.date}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  {SLOTS.map((s) => {
                    const sel = slot === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setSlot(s)}
                        className={cn(
                          "rounded-2xl border-2 py-3 text-sm font-bold transition-all",
                          sel
                            ? "border-gold bg-onyx text-ivory shadow-soft"
                            : "border-border bg-card text-foreground hover:border-foreground/20",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                  Yakuniy ko'rinish
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {t("booking.summary")}
                </h2>

                <div className="mt-6 overflow-hidden rounded-3xl bg-card shadow-soft ring-1 ring-foreground/5">
                  <div className="relative bg-onyx p-5 text-ivory">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(80% 60% at 80% 0%, rgba(212,175,55,0.18), transparent 70%)",
                      }}
                    />
                    <div className="relative flex items-center gap-3">
                      <div
                        className="h-14 w-14 rounded-2xl ring-1 ring-ivory/20"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.78 0.05 ${(Number(salon.id) * 80) % 360}), oklch(0.30 0.04 ${(Number(salon.id) * 80 + 50) % 360}))`,
                        }}
                      />
                      <div>
                        <p className="font-display text-lg font-semibold">{salon.name}</p>
                        <p className="text-xs text-ivory/70">{salon.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 px-5 py-4 text-sm">
                    <SummaryRow label="Usta" value={selectedBarber?.name ?? "—"} />
                    <SummaryRow
                      label="Sana"
                      value={`${dayList[dayIdx].day} ${dayList[dayIdx].date}`}
                    />
                    <SummaryRow label="Vaqt" value={slot ?? "—"} />
                    <SummaryRow
                      label="Davomiyligi"
                      value={`${totalDuration} min`}
                    />
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-2 px-5 py-4">
                    {selectedServices.map((s) => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="font-bold tabular-nums">
                          {formatPrice(s.price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-border" />

                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {t("booking.total")}
                    </span>
                    <span className="font-display text-2xl font-semibold tabular-nums text-gold">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating summary pill (above CTA) */}
      <div
        className="pointer-events-none fixed inset-x-0 z-40 mx-auto flex max-w-[440px] justify-center px-5 lg:left-[240px] lg:max-w-[640px]"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 92px)",
        }}
      >
        <FloatingSummaryPill
          show={selectedServices.length > 0 && step < 4}
          count={selectedServices.length}
          totalMinutes={totalDuration}
          totalPrice={total}
        />
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-md lg:left-[240px]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="mx-auto flex max-w-[480px] gap-2 lg:max-w-[720px]">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-full border-2 border-foreground py-3.5 text-sm font-bold"
            >
              {t("common.back")}
            </button>
          )}
          {step < 4 ? (
            <button
              disabled={!canAdvance}
              onClick={() => canAdvance && setStep((s) => s + 1)}
              className={cn(
                "flex-[2] rounded-full py-3.5 text-sm font-bold tracking-wide transition-all shadow-soft",
                canAdvance
                  ? "bg-foreground text-background active:scale-[0.99]"
                  : "bg-surface-2 text-muted-foreground",
              )}
            >
              {t("common.next")}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-[2] inline-flex items-center justify-center gap-2 rounded-full bg-gold py-3.5 text-sm font-bold tracking-wide text-onyx shadow-luxury active:scale-[0.99]"
            >
              <Clock className="h-4 w-4" strokeWidth={2.4} />
              {t("booking.confirm")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
