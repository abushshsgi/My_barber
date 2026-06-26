import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BookingForPicker } from "@/components/booking/BookingForPicker";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { DesktopPageHeader } from "@/components/desktop/ui/DesktopPageHeader";
import { BookingSummaryAside } from "@/components/booking/BookingSummaryAside";
import { formatPrice } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { Stepper } from "@/components/Stepper";
import { useCreateBooking, useBookingAvailability } from "@/hooks/use-bookings-api";
import { useFamilyMembers } from "@/hooks/use-family";
import { useDisplayUser } from "@/hooks/use-me";
import { useSalonBarberServices } from "@/hooks/use-salon-barber-services";
import { useSalonPage } from "@/hooks/use-salon-page";
import { filterSalonServicesForBarber, resolveDefaultSalonBarberId } from "@/lib/salon-services";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking/$salonId")({
  head: () => ({ meta: [{ title: "Band qilish — mysaloon.uz" }] }),
  validateSearch: (search: Record<string, unknown>): { date?: string; barber?: string } => {
    const rawBarber = typeof search.barber === "string" ? search.barber.trim() : "";
    const barber = rawBarber.replace(/^["']+|["']+$/g, "") || undefined;
    return {
      date: typeof search.date === "string" ? search.date : undefined,
      barber,
    };
  },
  component: BookingFlow,
});

const DAYS = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan", "Yak"];
const SLOTS = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15",
  "10:30", "10:45", "11:00", "11:15", "11:30", "11:45",
  "12:00", "12:15", "14:00", "14:15", "14:30", "14:45",
];

function buildDayList(initialDate?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let start = new Date(today);
  if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
    const parsed = new Date(`${initialDate}T12:00:00`);
    if (!Number.isNaN(parsed.getTime()) && parsed >= today) {
      start = parsed;
    }
  }
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d.getDate(), day: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1], full: d };
  });
}

function useBookingSalonState(
  salonId: string,
  opts?: { initialDate?: string; initialBarber?: string },
) {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useDisplayUser();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { salon, isLoading } = useSalonPage(salonId);
  const createBooking = useCreateBooking();
  const [familyMemberId, setFamilyMemberId] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);

  useEffect(() => {
    if (!salon?.staff.length) return;
    setBarberId((prev) => {
      if (prev) return prev;
      const fromUrl = opts?.initialBarber?.replace(/^["']+|["']+$/g, "");
      if (fromUrl && salon.staff.some((b) => b.id === fromUrl)) return fromUrl;
      return resolveDefaultSalonBarberId(salon.staff);
    });
  }, [salon, opts?.initialBarber]);

  useEffect(() => {
    setServiceIds([]);
  }, [barberId]);

  const barberServicesQuery = useSalonBarberServices(salonId, barberId);

  const pickBarber = (id: string) => {
    setBarberId(id);
  };

  const dayList = buildDayList(opts?.initialDate);

  const dateIso = dayList[dayIdx]?.full ? dayList[dayIdx].full.toISOString().slice(0, 10) : "";

  const availability = useBookingAvailability({
    salon: parseInt(salonId, 10),
    barber: barberId ? parseInt(barberId, 10) : 0,
    date: dateIso,
    serviceIds: serviceIds.map((id) => parseInt(id, 10)).filter(Number.isFinite),
    enabled: step === 3 && Boolean(barberId) && serviceIds.length > 0 && Boolean(dateIso),
  });

  const slotOptions =
    availability.data?.slots?.map((s) => {
      if (typeof s === "string") return s;
      return new Date(s.start).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    }) ?? SLOTS;

  const selectedBarber = salon?.staff.find((b) => b.id === barberId);
  const barberServiceOptions = useMemo(() => {
    if (barberServicesQuery.data?.length) return barberServicesQuery.data;
    if (!barberId) return salon?.services ?? [];
    return filterSalonServicesForBarber(salon?.services ?? [], barberId);
  }, [barberServicesQuery.data, barberId, salon?.services]);
  const selectedServices = barberServiceOptions.filter((s) => serviceIds.includes(s.id));
  const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const bookedForLabel =
    familyMemberId != null
      ? familyMembers.find((m) => m.id === familyMemberId)?.name ?? ""
      : user.name || t("booking.forSelf", { defaultValue: "O'zim uchun" });
  const canAdvance =
    (step === 1 && barberId) ||
    (step === 2 && serviceIds.length > 0) ||
    (step === 3 && slot) ||
    step === 4;

  const handleSubmit = async () => {
    if (!salon || !barberId || !slot || serviceIds.length === 0) return;
    const d = new Date(dayList[dayIdx].full);
    const [h, m] = slot.split(":");
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    try {
      await createBooking.mutateAsync({
        salon: parseInt(salonId, 10),
        barber: parseInt(barberId, 10),
        start_at: d.toISOString(),
        service_ids: serviceIds.map((id) => parseInt(id, 10)),
        family_member_id: familyMemberId,
      });
      toast.success("Buyurtma yuborildi!", { description: `${salon.name} · ${slot}` });
      setTimeout(() => router.navigate({ to: "/bookings" }), 700);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return {
    familyMemberId,
    setFamilyMemberId,
    salon,
    isLoading,
    step,
    setStep,
    barberId,
    setBarberId: pickBarber,
    serviceIds,
    setServiceIds,
    dayIdx,
    setDayIdx,
    slot,
    setSlot,
    dayList,
    slotOptions,
    selectedServices,
    barberServiceOptions,
    barberServicesLoading: barberServicesQuery.isLoading,
    total,
    selectedBarber,
    bookedForLabel,
    canAdvance,
    handleSubmit,
  };
}

function BookingStepContent({
  state,
  t,
}: {
  state: ReturnType<typeof useBookingSalonState>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const { salon, step, familyMemberId, setFamilyMemberId, barberId, setBarberId, serviceIds, setServiceIds, dayIdx, setDayIdx, slot, setSlot, dayList, slotOptions, selectedServices, barberServiceOptions, barberServicesLoading, selectedBarber, bookedForLabel, total } = state;
  if (!salon) return null;

  if (step === 1) {
    return (
      <div className="space-y-8">
        <BookingForPicker value={familyMemberId} onChange={setFamilyMemberId} />
        <div>
          <h2 className="text-xl font-bold">{t("booking.selectBarber")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{salon.name}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {salon.staff.map((b) => {
            const bookable = b.isBookable !== false;
            const isOwner = b.role === "Salon egasi";
            return (
            <button
              key={b.id}
              type="button"
              disabled={!bookable}
              onClick={() => bookable && setBarberId(b.id)}
              className={cn(
                "rounded-2xl border-2 p-4 text-left",
                barberId === b.id ? "border-foreground bg-surface" : "border-transparent bg-surface",
                !bookable && "cursor-not-allowed opacity-50",
              )}
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground text-base font-bold text-background">
                {b.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <p className="mt-3 text-sm font-bold">{b.name}</p>
              <p className="text-[11px] text-muted-foreground">{b.role}</p>
              {!bookable ? (
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                  {isOwner
                    ? t("salon.staff.notBookableYet", { defaultValue: "Hozircha band qilib bo'lmaydi" })
                    : t("salon.staff.comingSoon", { defaultValue: "Tez orada" })}
                </p>
              ) : (
              <p className="flex items-center gap-1 text-[11px] font-bold">
                <Star className="h-3 w-3 fill-foreground" /> {b.rating}
              </p>
              )}
            </button>
            );
          })}
        </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div>
        <h2 className="text-xl font-bold">{t("booking.selectService")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{selectedBarber?.name}</p>
        {barberServicesLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : barberServiceOptions.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {t("booking.noServices", { defaultValue: "Bu usta uchun xizmatlar topilmadi" })}
          </p>
        ) : (
        <div className="mt-6 space-y-2">
          {barberServiceOptions.map((s) => {
            const sel = serviceIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceIds((prev) => (prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                className={cn("flex w-full items-center justify-between rounded-2xl border-2 p-4", sel ? "border-foreground bg-surface" : "border-transparent bg-surface")}
              >
                <div className="min-w-0 text-left">
                  <h3 className="truncate text-sm font-bold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">{s.duration} {t("salon.minutes")} · {formatPrice(s.price)}</p>
                </div>
                <div className={cn("grid h-6 w-6 place-items-center rounded-md border-2", sel ? "border-foreground bg-foreground" : "border-border")}>
                  {sel ? <Check className="h-3.5 w-3.5 text-background" strokeWidth={3} /> : null}
                </div>
              </button>
            );
          })}
        </div>
        )}
      </div>
    );
  }

  if (step === 3) {
    return (
      <div>
        <h2 className="text-xl font-bold">{t("booking.selectTime")}</h2>
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
          {dayList.map((d, i) => (
            <button key={i} type="button" onClick={() => setDayIdx(i)} className={cn("flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl", dayIdx === i ? "bg-foreground text-background" : "bg-surface")}>
              <span className="text-[10px] font-bold uppercase opacity-70">{d.day}</span>
              <span className="text-lg font-bold">{d.date}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {slotOptions.map((s) => (
            <button key={s} type="button" onClick={() => setSlot(s)} className={cn("rounded-xl border-2 py-3 text-sm font-bold", slot === s ? "border-foreground bg-foreground text-background" : "border-border")}>
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold">{t("booking.summary")}</h2>
      <div className="mt-6 rounded-2xl bg-surface p-5">
        <p className="text-base font-bold">{salon.name}</p>
        <div className="my-4 h-px bg-border" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("booking.forWhom", { defaultValue: "Kim uchun" })}</span>
            <span className="font-bold">{bookedForLabel}</span>
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">Usta</span><span className="font-bold">{selectedBarber?.name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Vaqt</span><span className="font-bold">{dayList[dayIdx].day} {dayList[dayIdx].date} · {slot}</span></div>
        </div>
        <div className="my-4 h-px bg-border" />
        {selectedServices.map((s) => (
          <div key={s.id} className="flex justify-between text-sm"><span>{s.name}</span><span className="font-bold">{formatPrice(s.price)}</span></div>
        ))}
        <div className="mt-4 flex justify-between font-bold"><span>{t("booking.total")}</span><span className="text-xl">{formatPrice(total)}</span></div>
      </div>
    </div>
  );
}

function BookingNavButtons({ state, t }: { state: ReturnType<typeof useBookingSalonState>; t: ReturnType<typeof useTranslation>["t"] }) {
  const { step, setStep, canAdvance, handleSubmit } = state;
  return (
    <div className="mt-8 flex gap-2">
      {step > 1 ? (
        <button type="button" onClick={() => setStep((s) => s - 1)} className="flex-1 rounded-2xl border-2 border-foreground py-4 text-sm font-bold">
          {t("common.back")}
        </button>
      ) : null}
      {step < 4 ? (
        <button type="button" disabled={!canAdvance} onClick={() => canAdvance && setStep((s) => s + 1)} className={cn("flex-[2] rounded-2xl py-4 text-sm font-bold", canAdvance ? "bg-foreground text-background" : "bg-surface-2 text-muted-foreground")}>
          {t("common.next")}
        </button>
      ) : (
        <button type="button" onClick={handleSubmit} className="flex-[2] rounded-2xl bg-foreground py-4 text-sm font-bold text-background">
          {t("booking.confirm")}
        </button>
      )}
    </div>
  );
}

function BookingMobile() {
  const { t } = useTranslation();
  const { salonId } = useParams({ from: "/booking/$salonId" });
  const { date: initialDate, barber: initialBarber } = Route.useSearch();
  const state = useBookingSalonState(salonId, { initialDate, initialBarber });
  const stepLabels = [t("booking.step1"), t("booking.step2"), t("booking.step3"), t("booking.step4")];

  if (state.isLoading || !state.salon) {
    return <div className="flex min-h-[40vh] items-center justify-center"><p className="text-sm text-muted-foreground">{t("common.loading")}</p></div>;
  }

  return (
    <div>
      <PageHeader showBack title={t("booking.title")} />
      <div className="px-5 pt-2"><Stepper steps={stepLabels} current={state.step} /></div>
      <div className="px-5 pt-8 pb-32">
        <BookingStepContent state={state} t={t} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-md" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}>
        <div className="mx-auto flex max-w-[480px] gap-2">
          <BookingNavButtons state={state} t={t} />
        </div>
      </div>
    </div>
  );
}

function BookingDesktop() {
  const { t } = useTranslation();
  const { salonId } = useParams({ from: "/booking/$salonId" });
  const { date: initialDate, barber: initialBarber } = Route.useSearch();
  const state = useBookingSalonState(salonId, { initialDate, initialBarber });
  const stepLabels = [t("booking.step1"), t("booking.step2"), t("booking.step3"), t("booking.step4")];

  if (state.isLoading || !state.salon) {
    return <div className="flex min-h-[40vh] items-center justify-center"><p className="text-sm text-muted-foreground">{t("common.loading")}</p></div>;
  }

  return (
    <div>
      <DesktopPageHeader title={t("booking.title")} description={state.salon.name} />
      <div className="mt-6 max-w-xl"><Stepper steps={stepLabels} current={state.step} /></div>
      <div className="mt-8 grid grid-cols-[1fr_320px] gap-8 items-start">
        <div>
          <BookingStepContent state={state} t={t} />
          <BookingNavButtons state={state} t={t} />
        </div>
        <BookingSummaryAside
          salon={state.salon}
          selectedBarber={state.selectedBarber}
          selectedServices={state.selectedServices}
          total={state.total}
          dayList={state.dayList}
          dayIdx={state.dayIdx}
          slot={state.slot}
          step={state.step}
        />
      </div>
    </div>
  );
}

function BookingFlow() {
  return <DesktopPageSplit mobile={<BookingMobile />} desktop={<BookingDesktop />} />;
}
