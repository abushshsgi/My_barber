import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";
import {
  Calendar,
  MessageSquare,
  Star,
  Clock,
  X as XIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { bookings, formatPrice } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { getUpcomingBookings } from "@/lib/bookings-utils";
import { LifecycleTimeline } from "@/components/luxury/LifecycleTimeline";
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
  }, [focus, now]);

  return (
    <div>
      <PageHeader
        title={t("bookings.title")}
        subtitle="Sayohatingiz vaqt o'qida"
      />

      {/* Segmented control */}
      <div className="px-5">
        <div className="glass-dock relative flex gap-1 rounded-full p-1 shadow-soft">
          {(["upcoming", "history"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "relative flex-1 rounded-full py-2.5 text-[12px] font-bold tracking-wide transition-colors",
                tab === k ? "text-background" : "text-muted-foreground",
              )}
            >
              {tab === k && (
                <motion.span
                  layoutId="bookings-tab"
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{t(`bookings.${k}`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-6">
        {list.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-7 w-7" />}
            title={t("common.empty")}
            description="Hozircha buyurtmangiz yo'q."
            action={
              <Link
                to="/"
                className="rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background shadow-soft"
              >
                Salonlarni ko'rish
              </Link>
            }
          />
        ) : (
          <div className="relative">
            {/* Vertical journey rail */}
            <span
              aria-hidden
              className="absolute left-[14px] top-0 h-full w-px"
              style={{
                background:
                  "linear-gradient(to bottom, color-mix(in oklch, var(--gold) 30%, transparent), color-mix(in oklch, var(--gold) 0%, transparent))",
              }}
            />
            <div className="space-y-4 pl-8">
              {list.map((b, i) => (
                <div key={b.id} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-[26px] top-5 grid h-3 w-3 place-items-center rounded-full ring-4",
                      b.status === "accepted"
                        ? "bg-gold ring-gold/20"
                        : b.status === "done"
                          ? "bg-foreground ring-foreground/15"
                          : b.status === "cancelled"
                            ? "bg-destructive ring-destructive/15"
                            : "bg-surface-2 ring-surface-2/40",
                    )}
                  />
                  <BookingCard
                    booking={b}
                    focused={focus === b.id}
                    canSwipe={tab === "upcoming"}
                    index={i}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking: b,
  focused,
  canSwipe,
  index,
}: {
  booking: typeof bookings[number];
  focused?: boolean;
  canSwipe?: boolean;
  index?: number;
}) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const d = new Date(b.date);
  const dateStr = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

  // Swipe-to-reveal — drag left up to 152px to show actions.
  const x = useMotionValue(0);
  const revealed = useRef(false);
  const bg = useTransform(x, [-152, 0], [1, 0]);

  const reset = () => animate(x, 0, { type: "spring", stiffness: 380, damping: 34 });
  const reveal = () => animate(x, -152, { type: "spring", stiffness: 380, damping: 34 });

  return (
    <div
      id={`booking-${b.id}`}
      className={cn(
        "relative overflow-hidden rounded-3xl",
        focused && "ring-2 ring-gold ring-offset-2 ring-offset-background",
      )}
    >
      {/* Underlay actions (revealed when card swipes left) */}
      {canSwipe && (b.status === "pending" || b.status === "accepted") && (
        <motion.div
          style={{ opacity: bg }}
          className="pointer-events-none absolute inset-y-0 right-0 z-0 flex items-center gap-2 pr-3"
        >
          <Link
            to="/chat"
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full bg-foreground text-background shadow-luxury"
            aria-label={t("bookings.chat") as string}
          >
            <MessageSquare className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-luxury"
            aria-label={t("common.cancel") as string}
          >
            <XIcon className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </motion.div>
      )}

      <motion.div
        drag={canSwipe ? "x" : false}
        dragConstraints={{ left: -152, right: 0 }}
        dragElastic={0.05}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (reduce) return reset();
          if (info.offset.x < -60 || info.velocity.x < -300) {
            revealed.current = true;
            reveal();
          } else {
            revealed.current = false;
            reset();
          }
        }}
        className="relative z-10 rounded-3xl border border-border bg-card shadow-soft"
      >
        <div className="flex items-start gap-3 p-4">
          <div
            className="h-16 w-16 shrink-0 rounded-2xl ring-1 ring-foreground/10"
            style={{
              background: `linear-gradient(135deg, oklch(0.78 0.05 ${(Number(b.salonId) * 80) % 360}), oklch(0.32 0.04 ${(Number(b.salonId) * 80 + 50) % 360}))`,
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-display text-base font-semibold leading-tight">
                {b.salonName}
              </h3>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                  b.status === "pending" && "bg-surface text-muted-foreground",
                  b.status === "accepted" && "bg-gold text-onyx",
                  b.status === "done" && "border border-border text-muted-foreground",
                  b.status === "cancelled" && "bg-destructive/10 text-destructive",
                )}
              >
                {t(`bookings.status.${b.status}`)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.serviceName} · {b.barberName}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1 font-bold">
                <Calendar className="h-3 w-3" strokeWidth={2.4} />
                {dateStr}
              </span>
              <span className="inline-flex items-center gap-1 font-bold">
                <Clock className="h-3 w-3" strokeWidth={2.4} />
                {timeStr}
              </span>
              <span className="font-bold text-gold">{formatPrice(b.price)}</span>
            </div>
          </div>
        </div>

        <div className="px-4">
          <LifecycleTimeline status={b.status} />
        </div>

        <div className="mt-3 flex gap-2 border-t border-border p-3">
          {b.status === "done" ? (
            <button className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface py-2.5 text-xs font-bold">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" strokeWidth={0} />
              {t("bookings.writeReview")}
            </button>
          ) : (
            <Link
              to="/chat"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface py-2.5 text-xs font-bold"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {t("bookings.chat")}
            </Link>
          )}
          {b.status === "pending" || b.status === "accepted" ? (
            <button
              onClick={() => (revealed.current ? reset() : reveal())}
              className="flex-1 rounded-full border border-foreground py-2.5 text-xs font-bold"
            >
              {t("common.cancel")}
            </button>
          ) : null}
        </div>

        {canSwipe && index === 0 && (
          <p className="pb-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
            ← Surib amallarni oching
          </p>
        )}
      </motion.div>
    </div>
  );
}
