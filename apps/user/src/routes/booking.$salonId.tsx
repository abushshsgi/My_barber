import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { salons, formatPrice } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { Stepper } from "@/components/Stepper";
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
  const salon = salons.find((s) => s.id === salonId) ?? salons[0];

  const [step, setStep] = useState(1);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);

  const stepLabels = [t("booking.step1"), t("booking.step2"), t("booking.step3"), t("booking.step4")];
  const canAdvance =
    (step === 1 && barberId) ||
    (step === 2 && serviceIds.length > 0) ||
    (step === 3 && slot) ||
    step === 4;

  const selectedServices = salon.services.filter((s) => serviceIds.includes(s.id));
  const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const selectedBarber = salon.staff.find((b) => b.id === barberId);

  const today = new Date();
  const dayList = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return { date: d.getDate(), day: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] };
  });

  const handleSubmit = () => {
    toast.success("Buyurtma yuborildi!", {
      description: `${salon.name} · ${slot}`,
    });
    setTimeout(() => router.navigate({ to: "/bookings" }), 700);
  };

  return (
    <div>
      <PageHeader showBack title={t("booking.title")} />

      <div className="px-5 pt-2">
        <Stepper steps={stepLabels} current={step} />
      </div>

      <div className="px-5 pt-8 pb-32">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("booking.selectBarber")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{salon.name}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {salon.staff.map((b) => {
                const sel = barberId === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setBarberId(b.id)}
                    className={cn(
                      "rounded-2xl border-2 p-4 text-left transition-all",
                      sel
                        ? "border-foreground bg-surface"
                        : "border-transparent bg-surface",
                    )}
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground text-base font-bold text-background">
                      {b.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <p className="mt-3 text-sm font-bold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.role}</p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-bold">
                      <Star className="h-3 w-3 fill-foreground" /> {b.rating}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("booking.selectService")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedBarber?.name}
            </p>
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
                      "flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                      sel ? "border-foreground bg-surface" : "border-transparent bg-surface",
                    )}
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold">{s.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.duration} {t("salon.minutes")} · {formatPrice(s.price)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-md border-2",
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

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("booking.selectTime")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sana va vaqtni tanlang</p>

            <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
              {dayList.map((d, i) => {
                const sel = dayIdx === i;
                return (
                  <button
                    key={i}
                    onClick={() => setDayIdx(i)}
                    className={cn(
                      "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl transition-all",
                      sel
                        ? "bg-foreground text-background"
                        : "bg-surface text-foreground",
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase opacity-70">
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
                      "rounded-xl border-2 py-3 text-sm font-bold transition-all",
                      sel
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground",
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
            <h2 className="text-xl font-bold tracking-tight">{t("booking.summary")}</h2>

            <div className="mt-6 rounded-2xl bg-surface p-5">
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-14 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(salon.id) * 80) % 360}), oklch(0.55 0.06 ${(Number(salon.id) * 80 + 50) % 360}))`,
                  }}
                />
                <div>
                  <p className="text-base font-bold">{salon.name}</p>
                  <p className="text-xs text-muted-foreground">{salon.address}</p>
                </div>
              </div>

              <div className="my-4 h-px bg-border" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Usta</span>
                  <span className="font-bold">{selectedBarber?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Sana</span>
                  <span className="font-bold">
                    {dayList[dayIdx].day} {dayList[dayIdx].date}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Vaqt</span>
                  <span className="font-bold">{slot}</span>
                </div>
              </div>

              <div className="my-4 h-px bg-border" />

              <div className="space-y-2">
                {selectedServices.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="font-bold">{formatPrice(s.price)}</span>
                  </div>
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

      {/* Bottom CTA */}
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
          {step < 4 ? (
            <button
              disabled={!canAdvance}
              onClick={() => canAdvance && setStep((s) => s + 1)}
              className={cn(
                "flex-[2] rounded-2xl py-4 text-sm font-bold tracking-wide transition-all",
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
