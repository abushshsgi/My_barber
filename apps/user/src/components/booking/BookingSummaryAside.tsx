import { useTranslation } from "react-i18next";
import { formatPrice } from "@/lib/mock-data";
import type { Salon } from "@/lib/mock-data";
import { StickyAside } from "@/components/layout/StickyAside";

type Service = { id: string; name: string; price: number };
type Barber = { id: string; name: string };

type DayItem = { date: number; day: string };

type Props = {
  salon: Pick<Salon, "name" | "address">;
  selectedBarber?: Barber;
  selectedServices: Service[];
  total: number;
  dayList: DayItem[];
  dayIdx: number;
  slot: string | null;
  step: number;
};

export function BookingSummaryAside({
  salon,
  selectedBarber,
  selectedServices,
  total,
  dayList,
  dayIdx,
  slot,
  step,
}: Props) {
  const { t } = useTranslation();
  const day = dayList[dayIdx];

  return (
    <StickyAside className="hidden lg:block">
      <div className="rounded-2xl border border-border bg-surface/30 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("booking.summary", { defaultValue: "Buyurtma" })}
        </p>
        <p className="mt-2 text-lg font-bold">{salon.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{salon.address}</p>

        {selectedBarber ? (
          <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm">
            <span className="text-muted-foreground">{t("booking.step1")}</span>
            <span className="font-bold">{selectedBarber.name}</span>
          </div>
        ) : null}

        {selectedServices.length > 0 ? (
          <div className="mt-3 space-y-2 border-t border-border pt-4">
            {selectedServices.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="font-bold">{formatPrice(s.price)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {day && slot && step >= 3 ? (
          <div className="mt-3 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("booking.step3")}</span>
              <span className="font-bold">
                {day.day} {day.date} · {slot}
              </span>
            </div>
          </div>
        ) : null}

        {total > 0 ? (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-bold uppercase tracking-wide">{t("booking.total")}</span>
            <span className="text-xl font-bold">{formatPrice(total)}</span>
          </div>
        ) : null}
      </div>
    </StickyAside>
  );
}
