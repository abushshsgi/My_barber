import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarPlus, Clock3, Flame, MapPin, Percent, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import { PageHeader } from "@/components/PageHeader";
import { PageSpotlightEmpty } from "@/components/ui/PageSpotlightEmpty";
import { useSalonsList } from "@/hooks/use-salons";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { shortPrice, type Salon } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "Bugungi bo'sh vaqtlar — mysaloon.uz" }] }),
  component: TodayPage,
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

function TodayHero() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(135deg,#0f0f0f_0%,#2d2418_48%,#111_100%)] px-5 py-6 text-background sm:px-7">
      <div className="pointer-events-none absolute -right-6 top-0 h-36 w-36 rounded-full bg-amber-400/25 blur-3xl" aria-hidden />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
        <Flame className="h-3.5 w-3.5" />
        {t("todayPage.heroBadge")}
      </span>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-[28px]">{t("todayPage.heroTitle")}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">{t("todayPage.heroDesc")}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
          <Percent className="h-3.5 w-3.5" />
          {t("todayPage.statsDiscount")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
          <Clock3 className="h-3.5 w-3.5" />
          {t("todayPage.statsNext")}
        </span>
      </div>
    </section>
  );
}

function SalonPicker({
  salons,
  salonIdx,
  onPickSalon,
}: {
  salons: Salon[];
  salonIdx: number;
  onPickSalon: (index: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {t("todayPage.pickSalon")}
      </p>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
        {salons.map((s, i) => {
          const active = i === salonIdx;
          const d = discountFor(i);
          const cover = s.coverUrl ?? getSalonCoverUrl(s.coverSeed, s.category);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPickSalon(i)}
              className={cn(
                "w-[148px] shrink-0 overflow-hidden rounded-[22px] border text-left transition-all active:scale-[0.98]",
                active ? "border-foreground shadow-md" : "border-border bg-background",
              )}
            >
              <div className="relative h-24 w-full">
                <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute bottom-2 left-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                  −{d}%
                </span>
              </div>
              <div className={cn("px-3 py-2.5", active && "bg-foreground text-background")}>
                <p className="line-clamp-2 text-[12px] font-bold leading-snug">{s.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TodayContent() {
  const { t } = useTranslation();
  const { data: salons = [], isLoading } = useSalonsList();
  const [salonIdx, setSalonIdx] = useState(0);
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);

  const salon = salons[salonIdx] ?? salons[0];
  const discount = discountFor(salonIdx);
  const slots = useMemo(() => slotsForSalon(salonIdx), [salonIdx]);
  const salePrice = salon ? Math.round((salon.priceFrom * (100 - discount)) / 100) : 0;

  const onPickSalon = (index: number) => {
    setSalonIdx(index);
    setPickedSlot(null);
  };

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  if (!salon) {
    return (
      <PageSpotlightEmpty
        icon={CalendarPlus}
        tone="warm"
        title={t("todayPage.empty", { defaultValue: "Salonlar topilmadi" })}
        description={t("todayPage.emptyHint", {
          defaultValue: "Bugungi aksiyalar salonlar ro'yxati bilan ishlaydi.",
        })}
        action={
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background"
          >
            {t("favorites.browseSalons", { defaultValue: "Salonlarni topish" })}
          </Link>
        }
      />
    );
  }

  return (
    <div className="page-stagger space-y-6">
      <TodayHero />

      <SalonPicker salons={salons} salonIdx={salonIdx} onPickSalon={onPickSalon} />

      <section className="overflow-hidden rounded-[24px] border border-border bg-background shadow-sm">
        <div className="relative h-40 sm:h-48">
          <img
            src={salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed, salon.category)}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h3 className="text-xl font-bold">{salon.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{salon.address}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold text-background">
              −{discount}%
            </span>
            <span className="text-2xl font-bold tabular-nums">{shortPrice(salePrice)}</span>
            <span className="text-sm font-bold text-muted-foreground line-through">
              {shortPrice(salon.priceFrom)}
            </span>
          </div>
          <p className="flex items-center gap-1 text-sm font-bold">
            <Star className="h-4 w-4 fill-foreground" strokeWidth={0} />
            {salon.rating}
            <span className="font-normal text-muted-foreground">· {salon.distanceKm} km</span>
          </p>
        </div>
      </section>

      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("todayPage.pickTime")}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {slots.map((slot) => {
            const selected = pickedSlot === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setPickedSlot(slot)}
                className={cn(
                  "rounded-xl border py-3 font-mono text-[13px] font-bold tabular-nums transition-all active:scale-95",
                  selected
                    ? "border-foreground bg-foreground text-background shadow-sm"
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
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          {t("todayPage.viewSalon")} →
        </Link>
      </section>

      <div className="rounded-[24px] border border-border bg-surface/40 p-4 lg:static lg:border-0 lg:bg-transparent lg:p-0">
        {pickedSlot ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("todayPage.selectedSlot")}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums">{pickedSlot}</p>
            </div>
            <Link
              to="/booking/$salonId"
              params={{ salonId: salon.id }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background active:scale-[0.98]"
            >
              <CalendarPlus className="h-4 w-4" strokeWidth={2.4} />
              {t("todayPage.bookSelected")}
            </Link>
          </div>
        ) : (
          <p className="text-center text-sm font-medium text-muted-foreground sm:text-left">
            {t("todayPage.selectSlotHint")}
          </p>
        )}
      </div>
    </div>
  );
}

function TodayMobile() {
  const { t } = useTranslation();
  return (
    <div className="min-h-full bg-surface pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
      <PageHeader showBack title={t("todayPage.title")} subtitle={t("todayPage.pickerSubtitle")} />
      <div className="rounded-t-[28px] bg-background px-5 py-6 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.08)]">
        <TodayContent />
      </div>
    </div>
  );
}

function TodayDesktop() {
  const { t } = useTranslation();
  return (
    <AccountDesktopShell
      wide
      bare
      title={t("todayPage.title")}
      subtitle={t("todayPage.pickerSubtitle")}
    >
      <TodayContent />
    </AccountDesktopShell>
  );
}

function TodayPage() {
  return <DesktopPageSplit mobile={<TodayMobile />} desktop={<TodayDesktop />} />;
}
