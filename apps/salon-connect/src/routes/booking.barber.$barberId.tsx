// Re-uses booking.$salonId flow shape but with barber id param.
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { salons, formatPrice } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { Stepper } from "@/components/Stepper";
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
  const salon = salons[0];
  const barber = salon.staff.find((b) => b.id === barberId) ?? salon.staff[0];

  const [step, setStep] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);

  const labels = [t("booking.step2"), t("booking.step3"), t("booking.step4")];
  const canAdvance =
    (step === 1 && serviceIds.length > 0) ||
    (step === 2 && slot) ||
    step === 3;

  const selected = salon.services.filter((s) => serviceIds.includes(s.id));
  const total = selected.reduce((sum, s) => sum + s.price, 0);

  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return { date: d.getDate(), day: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] };
  });

  const handleSubmit = () => {
    toast.success("Buyurtma yuborildi!");
    setTimeout(() => router.navigate({ to: "/bookings" }), 700);
  };

  return (
    <div>
      <PageHeader showBack title={t("booking.title")} />

      <div className="px-5 pt-2">
        <Stepper steps={labels} current={step} />
      </div>

      {/* Barber banner */}
      <div className="mx-5 mt-6 flex items-center gap-3 rounded-2xl bg-surface p-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
          {barber.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <p className="text-sm font-bold">{barber.name}</p>
          <p className="text-xs text-muted-foreground">{barber.role}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs font-bold">
          <Star className="h-3.5 w-3.5 fill-foreground" />
          {barber.rating}
        </div>
      </div>

      <div className="px-5 pt-6 pb-32">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("booking.selectService")}</h2>
            <div className="mt-6 space-y-2">
              {salon.services.map((s) => {
                const sel = serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      setServiceIds((prev) =>
                        prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                      )
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left",
                      sel ? "border-foreground bg-surface" : "border-transparent bg-surface",
                    )}
                  >
                    <div>
                      <h3 className="text-sm font-bold">{s.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.duration} {t("salon.minutes")} · {formatPrice(s.price)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-md border-2",
                        sel ? "border-foreground bg-foreground" : "border-border",
                      )}
                    >
                      {sel && <Check className="h-3.5 w-3.5 text-background" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("booking.selectTime")}</h2>
            <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
              {days.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setDayIdx(i)}
                  className={cn(
                    "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl",
                    dayIdx === i ? "bg-foreground text-background" : "bg-surface text-foreground",
                  )}
                >
                  <span className="text-[10px] font-bold uppercase opacity-70">{d.day}</span>
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
                    "rounded-xl border-2 py-3 text-sm font-bold",
                    slot === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background",
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
            <h2 className="text-xl font-bold tracking-tight">{t("booking.summary")}</h2>
            <div className="mt-6 rounded-2xl bg-surface p-5">
              <div className="space-y-2 text-sm">
                <Row label="Usta" value={barber.name} />
                <Row label="Sana" value={`${days[dayIdx].day} ${days[dayIdx].date}`} />
                <Row label="Vaqt" value={slot ?? ""} />
              </div>
              <div className="my-4 h-px bg-border" />
              <div className="space-y-2">
                {selected.map((s) => (
                  <Row key={s.id} label={s.name} value={formatPrice(s.price)} />
                ))}
              </div>
              <div className="my-4 h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wide">
                  {t("booking.total")}
                </span>
                <span className="text-xl font-bold">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-md lg:left-[240px]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        <div className="mx-auto flex max-w-[480px] gap-2 lg:max-w-[720px]">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-2xl border-2 border-foreground py-4 text-sm font-bold"
            >
              {t("common.back")}
            </button>
          )}
          {step < 3 ? (
            <button
              disabled={!canAdvance}
              onClick={() => canAdvance && setStep((s) => s + 1)}
              className={cn(
                "flex-[2] rounded-2xl py-4 text-sm font-bold tracking-wide",
                canAdvance
                  ? "bg-foreground text-background"
                  : "bg-surface-2 text-muted-foreground",
              )}
            >
              {t("common.next")}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-[2] rounded-2xl bg-foreground py-4 text-sm font-bold tracking-wide text-background"
            >
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
