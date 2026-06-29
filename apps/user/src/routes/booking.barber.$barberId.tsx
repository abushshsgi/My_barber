import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatPrice } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { Stepper } from "@/components/Stepper";
import { BookingForPicker } from "@/components/booking/BookingForPicker";
import { BookingPaymentPicker, type BookingPaymentMethod } from "@/components/booking/BookingPaymentPicker";
import { BookingSummaryAside } from "@/components/booking/BookingSummaryAside";
import {
  useBarberByBarberId,
  useIndependentAvailability,
  useIndependentAvailabilityMonth,
} from "@/hooks/use-barber";
import { useCreateBooking } from "@/hooks/use-bookings-api";
import { useWalletBalance } from "@/hooks/use-wallet";
import { useFamilyMembers } from "@/hooks/use-family";
import { useDisplayUser } from "@/hooks/use-me";
import { DESKTOP_SIDEBAR_LEFT_CLASS } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking/barber/$barberId")({
  head: () => ({ meta: [{ title: "Usta bilan band qilish — mysaloon.uz" }] }),
  component: IndependentBookingFlow,
});

const DAYS = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan", "Yak"];

function IndependentBookingFlow() {
  const { t } = useTranslation();
  const { barberId } = useParams({ from: "/booking/barber/$barberId" });
  const router = useRouter();
  const user = useDisplayUser();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { data: barber, isLoading } = useBarberByBarberId(barberId);
  const createBooking = useCreateBooking();

  const [familyMemberId, setFamilyMemberId] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>("cash");
  const { balance: walletBalance, isLoading: walletLoading } = useWalletBalance();

  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return { date: d.getDate(), day: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1], full: d };
  });

  const dateIso = days[dayIdx]?.full ? days[dayIdx].full.toISOString().slice(0, 10) : "";

  const availability = useIndependentAvailability({
    barber: barber?.barber_id ?? 0,
    date: dateIso,
    barberServiceIds: serviceIds.map((id) => parseInt(id, 10)).filter(Number.isFinite),
    enabled: step === 2 && Boolean(barber) && serviceIds.length > 0 && Boolean(dateIso),
  });

  // Faqat API qaytargan haqiqiy bo'sh vaqtlar — hardcoded fallback yo'q.
  const slotOptions =
    availability.data?.slots?.map((s) =>
      new Date(s.start).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
    ) ?? [];
  const slotsLoading = step === 2 && availability.isLoading;
  const slotsClosedReason =
    availability.data?.closed_reason ?? availability.data?.detail ?? null;

  // 7 kunlik tasma uchun oylik bandlik — barber ishlamaydigan kunlarni
  // (haftalik dam, sana istisnosi) kalendar tasmasida o'chirib ko'rsatamiz.
  const serviceIdNums = serviceIds.map((id) => parseInt(id, 10)).filter(Number.isFinite);
  const lastDayFull = days[days.length - 1].full;
  const needsSecondMonth = lastDayFull.getMonth() !== today.getMonth();
  const monthEnabled = step === 2 && Boolean(barber) && serviceIdNums.length > 0;
  const monthA = useIndependentAvailabilityMonth({
    barber: barber?.barber_id ?? 0,
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    barberServiceIds: serviceIdNums,
    enabled: monthEnabled,
  });
  const monthB = useIndependentAvailabilityMonth({
    barber: barber?.barber_id ?? 0,
    year: lastDayFull.getFullYear(),
    month: lastDayFull.getMonth() + 1,
    barberServiceIds: serviceIdNums,
    enabled: monthEnabled && needsSecondMonth,
  });
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const data of [monthA.data, monthB.data]) {
      data?.days.forEach((d) => {
        if (d.available) set.add(d.date);
      });
    }
    return set;
  }, [monthA.data, monthB.data]);
  const monthLoaded = !monthA.isLoading && (!needsSecondMonth || !monthB.isLoading);

  if (isLoading || !barber) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const services = barber.services ?? [];
  const labels = [t("booking.step2"), t("booking.step3"), t("booking.step4")];
  const canAdvance =
    (step === 1 && serviceIds.length > 0) ||
    (step === 2 && slot) ||
    step === 3;

  const selected = services.filter((s) => serviceIds.includes(String(s.id)));
  const total = selected.reduce((sum, s) => sum + s.price, 0);
  const rating = barber.avg_rating ?? 0;
  const bookedForLabel =
    familyMemberId != null
      ? familyMembers.find((m) => m.id === familyMemberId)?.name ?? ""
      : user.name || t("booking.forSelf", { defaultValue: "O'zim uchun" });

  const handleSubmit = async () => {
    if (!slot || serviceIds.length === 0) return;
    if (paymentMethod === "online" && walletBalance < total) {
      toast.error("Hamyon balansi yetarli emas. Hamyonni to'ldiring yoki naqd tanlang.");
      return;
    }
    const d = new Date(days[dayIdx].full);
    const [h, m] = slot.split(":");
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    try {
      const created = await createBooking.mutateAsync({
        barber: barber.barber_id,
        start_at: d.toISOString(),
        barber_service_ids: serviceIds.map((id) => parseInt(id, 10)),
        family_member_id: familyMemberId,
        payment_method: paymentMethod,
      });
      toast.success("Buyurtma yuborildi!", {
        description: `${barber.name} · ${slot}`,
      });
      setTimeout(
        () =>
          router.navigate({
            to: "/bookings/$bookingId",
            params: { bookingId: String(created.id) },
          }),
        700,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="lg:px-6">
      <PageHeader showBack title={t("booking.title")} className="lg:hidden" />

      <div className="px-5 pt-2 lg:px-0">
        <Stepper steps={labels} current={step} />
      </div>

      <div className="mx-5 mt-6 flex items-center gap-3 rounded-2xl bg-surface p-4 lg:mx-0">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
          {barber.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <p className="text-sm font-bold">{barber.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs font-bold">
          <Star className="h-3.5 w-3.5 fill-foreground" />
          {rating.toFixed(1)}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
        <div className="px-5 pt-6 pb-32 lg:px-0 lg:pb-8">
        {step === 1 && (
          <div className="space-y-8">
            <BookingForPicker value={familyMemberId} onChange={setFamilyMemberId} />
            <div>
            <h2 className="text-xl font-bold tracking-tight">{t("booking.selectService")}</h2>
            <div className="mt-6 space-y-2">
              {services.map((s) => {
                const id = String(s.id);
                const sel = serviceIds.includes(id);
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      setServiceIds((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
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
                        {s.duration_minutes} {t("salon.minutes")} · {formatPrice(s.price)}
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
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("booking.selectTime")}</h2>
            <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
              {days.map((d, i) => {
                const iso = d.full.toISOString().slice(0, 10);
                const unavailable = monthLoaded && !availableDates.has(iso);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={unavailable}
                    onClick={() => {
                      setDayIdx(i);
                      setSlot(null);
                    }}
                    className={cn(
                      "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl",
                      dayIdx === i ? "bg-foreground text-background" : "bg-surface text-foreground",
                      unavailable && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase opacity-70">{d.day}</span>
                    <span className="text-lg font-bold">{d.date}</span>
                  </button>
                );
              })}
            </div>
            {slotsLoading ? (
              <div className="mt-6 grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[44px] animate-pulse rounded-xl bg-surface" />
                ))}
              </div>
            ) : slotOptions.length === 0 ? (
              <p className="mt-6 rounded-2xl border-2 border-border p-4 text-sm text-muted-foreground">
                {slotsClosedReason ??
                  t("booking.noSlots", { defaultValue: "Bu kuni bo'sh vaqt yo'q. Boshqa kunni tanlang." })}
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-3 gap-2">
                {slotOptions.map((s) => (
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
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">{t("booking.summary")}</h2>
            <BookingPaymentPicker
              value={paymentMethod}
              onChange={setPaymentMethod}
              total={total}
              walletBalance={walletBalance}
              walletLoading={walletLoading}
            />
            <div className="rounded-2xl bg-surface p-5">
              <div className="space-y-2 text-sm">
                <Row label={t("booking.forWhom", { defaultValue: "Kim uchun" })} value={bookedForLabel} />
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

          <div className="mt-8 hidden gap-2 lg:flex">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-2xl border-2 border-foreground py-4 text-sm font-bold"
              >
                {t("common.back")}
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                disabled={!canAdvance}
                onClick={() => canAdvance && setStep((s) => s + 1)}
                className={cn(
                  "flex-[2] rounded-2xl py-4 text-sm font-bold tracking-wide",
                  canAdvance ? "bg-foreground text-background" : "bg-surface-2 text-muted-foreground",
                )}
              >
                {t("common.next")}
              </button>
            ) : (
              <button
                type="button"
                disabled={createBooking.isPending}
                onClick={() => void handleSubmit()}
                className="flex-[2] rounded-2xl bg-foreground py-4 text-sm font-bold tracking-wide text-background disabled:opacity-60"
              >
                {createBooking.isPending
                  ? t("common.loading", { defaultValue: "Yuklanmoqda..." })
                  : t("booking.confirm")}
              </button>
            )}
          </div>
        </div>

        <BookingSummaryAside
          salon={{ name: barber.name, address: barber.salon_name ?? "Mustaqil usta" }}
          selectedBarber={{ id: barberId, name: barber.name }}
          selectedServices={selected.map((s) => ({
            id: String(s.id),
            name: s.name,
            price: s.price,
          }))}
          total={total}
          dayList={days}
          dayIdx={dayIdx}
          slot={slot}
          step={step + 1}
        />
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-md lg:hidden",
          DESKTOP_SIDEBAR_LEFT_CLASS,
        )}
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
              disabled={createBooking.isPending}
              onClick={() => void handleSubmit()}
              className="flex-[2] rounded-2xl bg-foreground py-4 text-sm font-bold tracking-wide text-background disabled:opacity-60"
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
