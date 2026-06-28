import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { BookingCard, BookingsEmptyState } from "@/components/bookings/BookingCard";
import { PagePillTabs } from "@/components/ui/PagePillTabs";
import { useBookings } from "@/hooks/use-bookings-api";
import { getUpcomingBookings, getHistoryBookings } from "@/lib/bookings-utils";

type Props = { focus?: string };

export function BookingsMobile({ focus }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const { data: bookings = [], isLoading } = useBookings();
  const now = Date.now();
  const upcoming = getUpcomingBookings(bookings, now);
  const history = getHistoryBookings(bookings, now);
  const list = tab === "upcoming" ? upcoming : history;

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`booking-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (bookings.some((b) => b.id === focus && getUpcomingBookings([b], now).length)) {
      setTab("upcoming");
    }
  }, [focus, now, bookings]);

  return (
    <div className="min-h-full bg-background pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
      <PageHeader
        title={t("bookings.title")}
        subtitle={t("bookings.subtitle", { defaultValue: "Kelayotgan va o'tgan tashriflar." })}
      />
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur-md">
        <PagePillTabs
          tabs={[
            { id: "upcoming" as const, label: t("bookings.upcoming"), count: upcoming.length },
            { id: "history" as const, label: t("bookings.history"), count: history.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="px-5 pt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-[24px] bg-surface" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <BookingsEmptyState />
        ) : (
          <div className="page-stagger space-y-4">
            {list.map((b) => (
              <BookingCard key={b.id} booking={b} focused={focus === b.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
