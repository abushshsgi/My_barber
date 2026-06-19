import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MessageSquare, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { DesktopPageHeader } from "@/components/desktop/ui/DesktopPageHeader";
import { useBookings } from "@/hooks/use-bookings-api";
import { getUpcomingBookings } from "@/lib/bookings-utils";
import { formatPrice, type BookingItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  focus?: string;
};

export function BookingsDesktopPage({ focus }: Props) {
  const { t } = useTranslation();
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
    document.getElementById(`booking-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (bookings.some((b) => b.id === focus && getUpcomingBookings([b], now).length)) {
      setTab("upcoming");
    }
  }, [focus, now, bookings]);

  return (
    <div>
      <DesktopPageHeader title={t("bookings.title")} />
      <div className="mt-6 flex max-w-md gap-1 rounded-2xl bg-surface p-1">
        {(["upcoming", "history"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-bold",
              tab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {t(`bookings.${k}`)}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-7 w-7" />}
            title={t("common.empty")}
            description="Hozircha buyurtmangiz yo'q."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface/50 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Salon</th>
                  <th className="px-4 py-3">Xizmat</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3">Narx</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <BookingRow key={b.id} booking={b} focused={focus === b.id} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingRow({ booking: b, focused }: { booking: BookingItem; focused?: boolean }) {
  const { t } = useTranslation();
  const d = new Date(b.date);
  const dateStr = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

  return (
    <tr id={`booking-${b.id}`} className={cn("border-b border-border last:border-0", focused && "bg-surface/60")}>
      <td className="px-4 py-3 font-bold">{b.salonName}</td>
      <td className="px-4 py-3 text-muted-foreground">{b.serviceName}</td>
      <td className="px-4 py-3">
        {dateStr} · {timeStr}
      </td>
      <td className="px-4 py-3 font-bold">{formatPrice(b.price)}</td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase">
          {t(`bookings.status.${b.status}`)}
        </span>
      </td>
      <td className="px-4 py-3">
        {b.status === "done" ? (
          <button type="button" className="flex items-center gap-1 text-xs font-bold">
            <Star className="h-3.5 w-3.5" /> {t("bookings.writeReview")}
          </button>
        ) : (
          <Link to="/chat" className="flex items-center gap-1 text-xs font-bold">
            <MessageSquare className="h-3.5 w-3.5" /> {t("bookings.chat")}
          </Link>
        )}
      </td>
    </tr>
  );
}
