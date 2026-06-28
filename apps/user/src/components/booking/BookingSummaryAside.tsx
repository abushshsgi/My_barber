import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { amenityIcon } from "@/lib/amenity-icons";
import { formatPrice, type Salon, type SalonAmenity } from "@/lib/mock-data";

type Service = { id: string; name: string; price: number };
type Barber = { id: string; name: string };
type DayItem = { date: number; day: string };

type Props = {
  salon: Pick<Salon, "name" | "address" | "amenities" | "venueKind">;
  selectedBarber?: Barber;
  selectedServices: Service[];
  total: number;
  dayList: DayItem[];
  dayIdx: number;
  slot: string | null;
  step: number;
};

const PREVIEW_COUNT = 6;

function BookingAmenitiesPreview({
  amenities,
  title,
}: {
  amenities: SalonAmenity[];
  title: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const preview = amenities.slice(0, PREVIEW_COUNT);
  const hasMore = amenities.length > PREVIEW_COUNT;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {preview.map((item) => {
          const Icon = amenityIcon(item.icon);
          return (
            <span
              key={item.code}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold"
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
              {item.label}
            </span>
          );
        })}
      </div>
      {hasMore ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 text-xs font-bold underline"
          >
            {t("salon.amenities.showAll", { count: amenities.length })}
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("salon.amenities.title")}</DialogTitle>
              </DialogHeader>
              <ul className="space-y-2">
                {amenities.map((item) => {
                  const Icon = amenityIcon(item.icon);
                  return (
                    <li key={item.code} className="flex items-center gap-3 text-sm">
                      <Icon className="size-5 shrink-0" strokeWidth={1.5} />
                      {item.label}
                    </li>
                  );
                })}
              </ul>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

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
  const amenities = salon.amenities ?? [];
  const amenityTitle =
    salon.venueKind === "salon"
      ? t("salon.nav.amenitiesSalon", { defaultValue: "Qulayliklar" })
      : t("salon.nav.amenities", { defaultValue: "Mijozlar uchun" });

  return (
    <aside className="sticky top-24">
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

        {amenities.length > 0 ? (
          <BookingAmenitiesPreview amenities={amenities} title={amenityTitle} />
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
    </aside>
  );
}
