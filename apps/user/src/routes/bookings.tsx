import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MessageSquare, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useBookings } from "@/hooks/use-bookings-api";
import { getUpcomingBookings } from "@/lib/bookings-utils";
import { formatPrice, type BookingItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type BookingsSearch = { focus?: string };

export const Route = createFileRoute("/bookings")({
  validateSearch: (search: Record<string, unknown>): BookingsSearch => ({
    focus: typeof search.focus === "string" ? search.focus : undefined,
  }),
  head: () => ({ meta: [{ title: "Buyurtmalarim — mysaloon.uz" }] }),
  component: MyBookings,
});

function MyBookings() {
  const { t } = useTranslation();
  const { focus } = Route.useSearch();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const { data: bookings = [], isLoading } = useBookings();
  const now = Date.now();

  const upcoming = getUpcomingBookings(bookings, now);
  const history = bookings.filter(
    (b) => new Date(b.date).getTime() < now || b.status === "cancelled",
  );

  const list = tab === "upcoming" ? upcoming : history;

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`booking-${focus}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (bookings.some((b) => b.id === focus && getUpcomingBookings([b], now).length)) {
      setTab("upcoming");
    }
  }, [focus, now, bookings]);

  return (
    <div className="lg:px-6">
      <PageHeader title={t("bookings.title")} className="lg:hidden" />

      <div className="sticky top-14 z-10 bg-background/95 px-5 backdrop-blur-md lg:top-14">
        <div className="flex gap-1 rounded-2xl bg-surface p-1">
          {(["upcoming", "history"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-[12px] font-bold tracking-wide transition-all",
                tab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t(`bookings.${k}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-6">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-7 w-7" />}
            title={t("common.empty")}
            description="Hozircha buyurtmangiz yo'q."
            action={
              <Link
                to="/"
                className="rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background"
              >
                Salonlarni ko'rish
              </Link>
            }
          />
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {list.map((b) => (
              <BookingCard key={b.id} booking={b} focused={focus === b.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking: b,
  focused,
}: {
  booking: BookingItem;
  focused?: boolean;
}) {
  const { t } = useTranslation();
  const d = new Date(b.date);
  const dateStr = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

  const statusStyles: Record<typeof b.status, string> = {
    pending: "bg-surface text-muted-foreground",
    accepted: "bg-foreground text-background",
    done: "border-2 border-border text-muted-foreground",
    cancelled: "border-2 border-border text-muted-foreground line-through",
  };

  return (
    <div
      id={`booking-${b.id}`}
      className={cn(
        "rounded-2xl border border-border bg-background p-4 transition-shadow",
        focused && "ring-2 ring-foreground",
      )}
    >
      <div className="flex items-start gap-3 lg:flex-row">
        <div
          className="h-16 w-16 shrink-0 rounded-xl lg:h-20 lg:w-20"
          style={{
            background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(b.salonId) * 80) % 360}), oklch(0.55 0.06 ${(Number(b.salonId) * 80 + 50) % 360}))`,
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold">{b.salonName}</h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                statusStyles[b.status],
              )}
            >
              {t(`bookings.status.${b.status}`)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {b.serviceName} · {b.barberName}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-bold">{dateStr}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-bold">{timeStr}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-bold">{formatPrice(b.price)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        {b.status === "done" ? (
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface py-2.5 text-xs font-bold">
            <Star className="h-3.5 w-3.5" /> {t("bookings.writeReview")}
          </button>
        ) : (
          <Link
            to="/chat"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface py-2.5 text-xs font-bold"
          >
            <MessageSquare className="h-3.5 w-3.5" /> {t("bookings.chat")}
          </Link>
        )}
        {b.status === "pending" || b.status === "accepted" ? (
          <button className="flex-1 rounded-xl border-2 border-foreground py-2.5 text-xs font-bold">
            {t("common.cancel")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
