// Independent barber booking flow — 3 qadam.
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

export const Route = createFileRoute("/booking/barber/$barberId")({
  head: () => ({ meta: [{ title: "Usta bilan band qilish — mysaloon.uz" }] }),
  component: IndependentBookingFlow,
});

const DAYS = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan", "Yak"];
const SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00"];

function IndependentBookingFlow() {
  const { t } = useTranslation();
  const { barberId } = useParams({ from: "/booking/barber/$barberId" });
  const router = useRouter();
  const reduce = useReducedMotion();
  const salon = salons[0];
  const barber = salon.staff.find((b) => b.id === barberId) ?? salon.staff[0];

  const [step, setStep] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);

  const labels = [
    t("booking.step2") as string,
    t("booking.step3") as string,
    t("booking.step4") as string,
  ];
  const canAdvance =
    (step === 1 && serviceIds.length > 0) ||
    (step === 2 && slot) ||
    step === 3;

  const selected = useMemo(
    () => salon.services.filter((s) => serviceIds.includes(s.id)),
    [salon.services, serviceIds],
  );
  const total = selected.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selected.reduce((sum, s) => sum + s.duration, 0);

  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return { date: d.getDate(), day: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] };
  });

  const handleSubmit = () => {
    toast.success("Bron so'rovi yuborildi!");
    setTimeout(() => router.navigate({ to: "/bookings" }), 700);
  };

  return (
    <div>
      <PageHeader showBack title={t("booking.title")} />

      <div className="px-5 pt-2">
        <RadialStepIndicator steps={labels} current={step} />
      </div>

      {/* Barber banner */}
      <div className="mx-5 mt-6 flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft">
        <div className="relative">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-onyx text-sm font-bold text-ivory ring-2 ring-gold/30">
            {barber.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <span className="absolute -bottom-1 -right-1 inline-flex h-5 items-center gap-0.5 rounded-full bg-gold px-1.5 text-[9px] font-bold text-onyx">
            <Star className="h-2.5 w-2.5 fill-onyx" strokeWidth={0} />
            {barber.rating}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{barber.name}</p>
          <p className="text-xs text-muted-foreground">{barber.role}</p>
        </div>
        <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Mustaqil
        </span>
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
                  Xizmatlar
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {t("booking.selectService")}
                </h2>
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
                        <div>
                          <h3 className="text-sm font-bold">{s.name}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {s.duration} {t("salon.minutes")} ·{" "}
                            <span className="font-bold text-foreground">
                              {formatPrice(s.price)}
                            </span>
                          </p>
                        </div>
                        <div
                          className={cn(
                            "grid h-6 w-6 place-items-center rounded-md border-2 transition-colors",
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

            {step === 2 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                  Vaqt
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {t("booking.selectTime")}
                </h2>
                <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
                  {days.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setDayIdx(i)}
                      className={cn(
                        "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl",
                        dayIdx === i
                          ? "bg-onyx text-ivory"
                          : "border border-border bg-card text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          dayIdx === i ? "text-gold" : "opacity-60",
                        )}
                      >
                        {d.day}
                      </span>
                      <span className="text-lg font-bold">{d.date}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {SLOTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlot(s)}
                      className={cn(
                        "rounded-2xl border-2 py-3 text-sm font-bold transition-all",
                        slot === s
                          ? "border-gold bg-onyx text-ivory"
                          : "border-border bg-card",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                  Yakuniy ko'rinish
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {t("booking.summary")}
                </h2>
                <div className="mt-6 overflow-hidden rounded-3xl bg-card shadow-soft ring-1 ring-foreground/5">
                  <div className="space-y-2 p-5 text-sm">
                    <Row label="Usta" value={barber.name} />
                    <Row label="Sana" value={`${days[dayIdx].day} ${days[dayIdx].date}`} />
                    <Row label="Vaqt" value={slot ?? "—"} />
                    <Row label="Davomiyligi" value={`${totalDuration} min`} />
                  </div>
                  <div className="h-px bg-border" />
                  <div className="space-y-2 p-5">
                    {selected.map((s) => (
                      <Row key={s.id} label={s.name} value={formatPrice(s.price)} />
                    ))}
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between p-5">
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

      {/* Floating summary pill */}
      <div
        className="pointer-events-none fixed inset-x-0 z-40 mx-auto flex max-w-[440px] justify-center px-5 lg:left-[240px] lg:max-w-[640px]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 92px)" }}
      >
        <FloatingSummaryPill
          show={selected.length > 0 && step < 3}
          count={selected.length}
          totalMinutes={totalDuration}
          totalPrice={total}
        />
      </div>

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
          {step < 3 ? (
            <button
              disabled={!canAdvance}
              onClick={() => canAdvance && setStep((s) => s + 1)}
              className={cn(
                "flex-[2] rounded-full py-3.5 text-sm font-bold tracking-wide shadow-soft",
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
