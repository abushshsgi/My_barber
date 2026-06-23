import { Link } from "@tanstack/react-router";
import { CalendarPlus, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BookingChatButton } from "@/components/bookings/BookingChatButton";
import { PageSpotlightEmpty } from "@/components/ui/PageSpotlightEmpty";
import { formatPrice, type BookingItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function BookingsEmptyState() {
  const { t } = useTranslation();

  return (
    <PageSpotlightEmpty
      icon={CalendarPlus}
      tone="warm"
      title={t("bookings.emptyTitle", { defaultValue: "Hali bron yo'q" })}
      description={t("bookings.emptyHint", {
        defaultValue: "Yaqin atrofdagi salonlardan vaqtni tanlab, birinchi broningizni qiling.",
      })}
      action={
        <Link
          to="/"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98] hover:opacity-95 sm:w-auto"
        >
          <CalendarPlus className="h-4 w-4" />
          {t("bookings.browseSalons", { defaultValue: "Bron qilish" })}
        </Link>
      }
    />
  );
}

const statusStyles: Record<BookingItem["status"], string> = {
  pending: "bg-amber-100 text-amber-900",
  accepted: "bg-foreground text-background",
  done: "border border-border bg-surface text-muted-foreground",
  cancelled: "border border-border bg-surface text-muted-foreground line-through",
};

export function BookingCard({ booking: b, focused }: { booking: BookingItem; focused?: boolean }) {
  const { t } = useTranslation();
  const d = new Date(b.date);
  const dateStr = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

  return (
    <article
      id={`booking-${b.id}`}
      className={cn(
        "overflow-hidden rounded-[24px] border border-border bg-background shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]",
        focused && "ring-2 ring-foreground",
      )}
    >
      <div className="flex items-stretch gap-0">
        <div
          className="w-24 shrink-0 sm:w-28"
          style={{
            background: `linear-gradient(160deg, oklch(0.88 0.04 ${(Number(b.salonId) * 80) % 360}), oklch(0.42 0.07 ${(Number(b.salonId) * 80 + 40) % 360}))`,
          }}
        />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold">{b.salonName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {b.serviceName} · {b.barberName}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                statusStyles[b.status],
              )}
            >
              {t(`bookings.status.${b.status}`)}
            </span>
          </div>

          {b.bookedForName ? (
            <p className="mt-2 text-xs font-semibold text-foreground">
              {t("family.bookFor", { name: b.bookedForName, defaultValue: "{{name}} uchun" })}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-bold">{dateStr}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-bold tabular-nums">{timeStr}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-bold tabular-nums">{formatPrice(b.price)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-border bg-surface/40 p-3 sm:px-5">
        {b.status === "done" ? (
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-background py-2.5 text-xs font-bold shadow-sm"
          >
            <Star className="h-3.5 w-3.5" /> {t("bookings.writeReview")}
          </button>
        ) : (
          <BookingChatButton barberId={b.barberId} />
        )}
        {b.status === "pending" || b.status === "accepted" ? (
          <button
            type="button"
            className="flex-1 rounded-xl border-2 border-foreground bg-background py-2.5 text-xs font-bold"
          >
            {t("common.cancel")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
