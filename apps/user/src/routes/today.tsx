import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarPlus, MapPin, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { salons, shortPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "Bugungi bo'sh vaqtlar — mysaloon.uz" }] }),
  component: TodayDeals,
});

const ALL_SLOTS = [
  "10:00",
  "10:30",
  "11:00",
  "12:00",
  "13:30",
  "14:00",
  "15:00",
  "16:30",
  "17:00",
  "18:00",
  "19:00",
  "20:30",
];

function discountFor(index: number) {
  return [15, 20, 25, 30][index % 4] ?? 15;
}

function slotsForSalon(index: number) {
  const taken = new Set<number>();
  const result: string[] = [];
  let offset = index % 5;
  while (result.length < 6 && taken.size < ALL_SLOTS.length) {
    const idx = (offset + result.length * 2) % ALL_SLOTS.length;
    if (!taken.has(idx)) {
      taken.add(idx);
      result.push(ALL_SLOTS[idx]!);
    }
    offset += 1;
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function TodayDeals() {
  const { t } = useTranslation();
  const [salonIdx, setSalonIdx] = useState(0);
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);

  const salon = salons[salonIdx] ?? salons[0];
  const discount = discountFor(salonIdx);
  const slots = useMemo(() => slotsForSalon(salonIdx), [salonIdx]);
  const salePrice = Math.round((salon.priceFrom * (100 - discount)) / 100);

  const onPickSalon = (index: number) => {
    setSalonIdx(index);
    setPickedSlot(null);
  };

  return (
    <div className="flex min-h-full flex-col bg-background pb-[calc(68px+env(safe-area-inset-bottom)+88px)]">
      <PageHeader showBack title={t("todayPage.title")} subtitle={t("todayPage.pickerSubtitle")} />

      {/* Salon carousel */}
      <div className="px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("todayPage.pickSalon")}
        </p>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {salons.map((s, i) => {
            const active = i === salonIdx;
            const d = discountFor(i);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onPickSalon(i)}
                className={cn(
                  "shrink-0 rounded-2xl border px-3 py-2.5 text-left transition-colors active:scale-95",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-foreground",
                )}
              >
                <p className="max-w-[120px] truncate text-[12px] font-bold">{s.name}</p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px] font-bold",
                    active ? "text-background/70" : "text-muted-foreground",
                  )}
                >
                  −{d}%
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected salon info */}
      <div className="mx-5 mt-4 rounded-[22px] border border-border bg-surface/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{salon.name}</h2>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{salon.address}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="flex items-center justify-end gap-1 text-sm font-bold">
              <Star className="h-4 w-4 fill-foreground" strokeWidth={0} />
              {salon.rating}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
              {salon.distanceKm} km
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2 border-t border-border/80 pt-3">
          <span className="rounded-lg bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
            −{discount}%
          </span>
          <span className="text-xl font-bold tabular-nums">{shortPrice(salePrice)}</span>
          <span className="text-sm font-bold text-muted-foreground line-through">
            {shortPrice(salon.priceFrom)}
          </span>
        </div>
      </div>

      {/* Slot grid */}
      <div className="mt-5 flex-1 px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("todayPage.pickTime")}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => {
            const selected = pickedSlot === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setPickedSlot(slot)}
                className={cn(
                  "rounded-xl border py-3 font-mono text-[13px] font-bold tabular-nums transition-colors active:scale-95",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:bg-surface",
                )}
              >
                {slot}
              </button>
            );
          })}
        </div>

        <Link
          to="/salon/$id"
          params={{ id: salon.id }}
          className="mt-4 inline-block text-[11px] font-bold uppercase tracking-wide text-muted-foreground underline-offset-2 hover:underline"
        >
          {t("todayPage.viewSalon")} →
        </Link>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed inset-x-0 z-40 border-t border-border bg-background/95 px-5 py-4 backdrop-blur-md lg:pl-[calc(240px+1.25rem)]"
        style={{ bottom: "calc(68px + env(safe-area-inset-bottom))" }}
      >
        {pickedSlot ? (
          <div className="mx-auto flex max-w-[480px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("todayPage.selectedSlot")}
              </p>
              <p className="font-mono text-lg font-bold tabular-nums">{pickedSlot}</p>
            </div>
            <Link
              to="/booking/$salonId"
              params={{ salonId: salon.id }}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-foreground px-5 py-3.5 text-sm font-bold text-background active:scale-[0.98]"
            >
              <CalendarPlus className="h-4 w-4" strokeWidth={2.4} />
              {t("todayPage.bookSelected")}
            </Link>
          </div>
        ) : (
          <p className="mx-auto max-w-[480px] text-center text-sm font-medium text-muted-foreground">
            {t("todayPage.selectSlotHint")}
          </p>
        )}
      </div>
    </div>
  );
}
