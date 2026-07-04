import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BookingCard, BookingsEmptyState } from "@/components/bookings/BookingCard";
import { PagePillTabs } from "@/components/ui/PagePillTabs";
import { useBookings } from "@/hooks/use-bookings-api";
import { getUpcomingBookings, getHistoryBookings } from "@/lib/bookings-utils";
import { getMobileContentPaddingClass } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type Props = { focus?: string };

export function BookingsMobile({ focus }: Props) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-background",
        getMobileContentPaddingClass(pathname),
      )}
    >
      <header className="shrink-0 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
          {t("bookings.title")}
        </h1>
        <p className="label-eyebrow mt-1">
          {t("bookings.subtitle", { defaultValue: "Kelayotgan va o'tgan tashriflar." })}
        </p>
      </header>

      <div className="sticky top-0 z-10 bg-background/95 px-4 py-3 backdrop-blur-md">
        <PagePillTabs
          tabs={[
            { id: "upcoming" as const, label: t("bookings.upcoming"), count: upcoming.length },
            { id: "history" as const, label: t("bookings.history"), count: history.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface" />
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
