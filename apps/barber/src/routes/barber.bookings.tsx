import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Play, CheckCircle2, Phone, X, Loader2 } from "lucide-react";
import { formatUZS, type Booking } from "@/components/barber/BarberContext";
import { StatusPill, UserAvatar } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";
import { paymentBadgeClass, paymentLabel } from "@/lib/payment-label";
import { useBarberBookingsQuery, useBookingActionMutation } from "@/hooks/use-barber-queries";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/bookings")({
  component: BookingsPage,
});

const TABS = [
  { id: "all", label: "Hammasi" },
  { id: "pending", label: "Yangi" },
  { id: "accepted", label: "Tasdiqlangan" },
  { id: "in_progress", label: "Davom etmoqda" },
  { id: "completed", label: "Yakunlangan" },
  { id: "cancelled", label: "Bekor" },
  { id: "rejected", label: "Rad etilgan" },
] as const;

function BookingsPage() {
  const { data: bookings = [], isLoading, isFetching } = useBarberBookingsQuery();
  const actionMut = useBookingActionMutation();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let rows = tab === "all" ? bookings : bookings.filter((b) => b.status === tab);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (b) => b.client.toLowerCase().includes(q) || b.service.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [bookings, tab, query]);

  const runAction = (id: string, action: Parameters<typeof actionMut.mutate>[0]["action"]) => {
    actionMut.mutate(
      { id, action },
      {
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const pendingId = actionMut.isPending ? actionMut.variables?.id : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-foreground">Bronlar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Mijozlar tomonidan qilingan barcha bronlar.
            {isFetching && !isLoading ? (
              <span className="ml-2 text-xs">Yangilanmoqda…</span>
            ) : null}
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Mijoz yoki xizmat bo'yicha qidirish"
          className="h-10 w-full sm:w-72 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="inline-flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 sm:px-4 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap",
              tab === t.id
                ? "bg-background text-foreground shadow-card font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-60">
              {t.id === "all" ? bookings.length : bookings.filter((b) => b.status === t.id).length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
              Bu kategoriyada bronlar yo'q.
            </div>
          ) : (
            filtered.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                busy={pendingId === b.id}
                onAccept={() => runAction(b.id, "accept")}
                onCancel={() => runAction(b.id, "cancel")}
                onStart={() => runAction(b.id, "start")}
                onComplete={() => runAction(b.id, "complete")}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BookingRow({
  booking: b,
  busy,
  onAccept,
  onCancel,
  onStart,
  onComplete,
}: {
  booking: Booking;
  busy: boolean;
  onAccept: () => void;
  onCancel: () => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-card hover:border-foreground/20 transition-colors",
        busy && "opacity-70",
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <UserAvatar src={b.client_avatar} name={b.client} className="size-12 shrink-0" />
        <div className="min-w-0">
          <div className="font-medium truncate">{b.client}</div>
          <div className="text-xs text-muted-foreground truncate">{b.service}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        <div className="text-sm">
          <div className="text-xs text-muted-foreground">Vaqt</div>
          <div className="font-medium">
            {b.date} · {b.time}
          </div>
        </div>
        <div className="text-sm">
          <div className="text-xs text-muted-foreground">Narx</div>
          <div className="font-medium">{formatUZS(b.price)}</div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
            paymentBadgeClass(b.payment_method),
          )}
        >
          {paymentLabel(b.payment_method)}
        </span>
        <StatusPill status={b.status} />
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            className="size-9 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center"
          >
            <Phone className="size-4" />
          </button>
          {busy ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : null}
          {b.status === "pending" && !busy && (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="size-9 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
              >
                <CheckCircle2 className="size-3.5" />
                Qabul qilish
              </button>
            </>
          )}
          {b.status === "accepted" && !busy && (
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              <Play className="size-3.5" />
              Boshlash
            </button>
          )}
          {b.status === "in_progress" && !busy && (
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              <CheckCircle2 className="size-3.5" />
              Tugatish
            </button>
          )}
          {b.status === "rejected" && (
            <span className="rounded-lg border border-destructive/20 px-3 py-2 text-sm font-medium text-destructive">
              Rad etilgan
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
