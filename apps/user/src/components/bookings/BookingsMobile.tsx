import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
    document
      .getElementById(`booking-${focus}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (bookings.some((b) => b.id === focus && getUpcomingBookings([b], now).length)) {
      setTab("upcoming");
    }
  }, [focus, now, bookings]);

  return (
    <div className="flex min-h-full min-w-0 flex-col overflow-x-clip bg-background">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/95 px-4 pb-2.5 backdrop-blur-md pt-[max(env(safe-area-inset-top),0.5rem)]">
        <h1 className="text-lg font-bold leading-tight tracking-tight">
          {t("bookings.title")}
        </h1>
        <div className="mt-2.5">
          <PagePillTabs
            tabs={[
              { id: "upcoming" as const, label: t("bookings.upcoming"), count: upcoming.length },
              { id: "history" as const, label: t("bookings.history"), count: history.length },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 pt-3">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            <BookingsEmptyState borderless />
          </div>
        ) : (
          <div className="page-stagger space-y-3 pb-4">
            {list.map((b) => (
              <BookingCard key={b.id} booking={b} focused={focus === b.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
