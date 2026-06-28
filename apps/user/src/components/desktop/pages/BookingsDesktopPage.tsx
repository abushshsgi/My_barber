import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookingCard, BookingsEmptyState } from "@/components/bookings/BookingCard";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import { PagePillTabs } from "@/components/ui/PagePillTabs";
import { useBookings } from "@/hooks/use-bookings-api";
import { getUpcomingBookings, getHistoryBookings } from "@/lib/bookings-utils";

type Props = {
  focus?: string;
};

export function BookingsDesktopPage({ focus }: Props) {
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
    <AccountDesktopShell
      wide
      bare
      title={t("bookings.title")}
      subtitle={t("bookings.subtitle", { defaultValue: "Kelayotgan va o'tgan tashriflar." })}
    >
      <PagePillTabs
        tabs={[
          { id: "upcoming" as const, label: t("bookings.upcoming"), count: upcoming.length },
          { id: "history" as const, label: t("bookings.history"), count: history.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-[24px] bg-surface" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <BookingsEmptyState />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {list.map((b) => (
              <BookingCard key={b.id} booking={b} focused={focus === b.id} />
            ))}
          </div>
        )}
      </div>
    </AccountDesktopShell>
  );
}
