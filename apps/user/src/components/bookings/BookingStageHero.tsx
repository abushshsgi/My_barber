import { useEffect, useState } from "react";
import { buildCheckInQrUrl, computeAppointmentCountdown } from "@mybarber/shared/booking-lifecycle";
import { CheckCircle2, Clock3, Loader2, QrCode, Sparkles, XCircle } from "lucide-react";
import type { BookingItem } from "@/lib/mock-data";
import { formatPrice } from "@/lib/mock-data";
import { useLiveBookingTimer } from "@/components/bookings/BookingProcessParts";
import { cn } from "@/lib/utils";

function useAppointmentCountdown(booking: Pick<BookingItem, "status" | "date">) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (booking.status !== "pending" && booking.status !== "accepted") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking.status]);
  return computeAppointmentCountdown(booking.date, now);
}

export function BookingStageHero({ booking }: { booking: BookingItem }) {
  const d = new Date(booking.date);
  const timeStr = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const dateStr = d.toLocaleDateString("uz-UZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const countdown = useAppointmentCountdown(booking);
  const timer = useLiveBookingTimer(booking);

  if (booking.status === "cancelled") {
    return (
      <section className="rounded-3xl bg-muted/40 px-5 py-8 text-center">
        <XCircle className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-bold">Bron bekor qilindi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Yangi vaqt tanlab qayta bron qilishingiz mumkin.
        </p>
      </section>
    );
  }

  if (booking.status === "done") {
    return (
      <section className="rounded-3xl bg-foreground px-5 py-8 text-center text-background">
        <Sparkles className="mx-auto size-10 opacity-90" />
        <h2 className="mt-3 text-xl font-bold">Xizmat yakunlandi</h2>
        <p className="mt-1 text-sm text-background/75">
          {booking.barberName} · {formatPrice(booking.price)}
        </p>
      </section>
    );
  }

  if (booking.status === "in_progress") {
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (timer.progress / 100) * circumference;
    return (
      <section className="rounded-3xl bg-emerald-950 px-5 py-8 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/90">
          Xizmat davom etmoqda
        </p>
        <div className="relative mx-auto mt-4 size-32">
          <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              className="text-white/15"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="text-emerald-300 transition-[stroke-dashoffset] duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{timer.elapsedLabel}</span>
            {timer.isRunning ? (
              <span className="text-[11px] text-emerald-200/80">−{timer.remainingLabel}</span>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-sm text-emerald-100/90">
          {booking.salonName} · {booking.barberName}
        </p>
      </section>
    );
  }

  if (booking.status === "accepted" && !booking.checkedInAt) {
    return (
      <section className="overflow-hidden rounded-3xl bg-foreground text-background">
        <div className="px-5 pb-2 pt-8 text-center">
          <CheckCircle2 className="mx-auto size-11 text-emerald-300" strokeWidth={1.75} />
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Buyurtma tasdiqlandi!</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-background/75">
            {booking.barberName} broningizni qabul qildi. Salonga kelganingizda pastdagi QR kodni
            sartaroshga ko&apos;rsating.
          </p>
        </div>

        <div className="mx-5 mb-5 mt-4 rounded-2xl bg-background p-5 text-foreground">
          {booking.checkInCode ? (
            <>
              <div className="flex items-center justify-center gap-2 text-sm font-bold">
                <QrCode className="size-4" />
                Qabul qilish QR kodi
              </div>
              <img
                src={buildCheckInQrUrl(booking.checkInCode, 240)}
                alt="Kelish QR kodi"
                className="mx-auto mt-4 size-52 rounded-2xl bg-white p-3"
              />
              {booking.checkInShortCode ? (
                <p className="mt-4 text-center font-mono text-2xl font-bold tracking-[0.35em]">
                  {booking.checkInShortCode}
                </p>
              ) : null}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Kod bir martalik — ekranni sartaroshga yaqin tuting
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm font-bold">QR tayyorlanmoqda…</p>
              <p className="mt-1 text-xs text-muted-foreground">Bir necha soniya kuting</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 pb-6 text-xs font-semibold text-background/70">
          <span>{booking.salonName}</span>
          <span>·</span>
          <span>{dateStr}</span>
          <span>·</span>
          <span className="tabular-nums">{timeStr}</span>
          {booking.orderNumber ? (
            <>
              <span>·</span>
              <span className="font-mono">{booking.orderNumber}</span>
            </>
          ) : null}
        </div>
      </section>
    );
  }

  if (booking.status === "accepted" && booking.checkedInAt) {
    return (
      <section className="rounded-3xl bg-emerald-600 px-5 py-8 text-center text-white">
        <CheckCircle2 className="mx-auto size-10" />
        <h2 className="mt-3 text-xl font-bold">Keldingiz!</h2>
        <p className="mt-1 text-sm text-emerald-100">Sartarosh tez orada xizmatni boshlaydi</p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-3xl px-5 py-8 text-center",
        countdown.isUpcoming ? "bg-amber-50" : "bg-muted/40",
      )}
    >
      <Clock3
        className={cn(
          "mx-auto size-10",
          countdown.isUpcoming ? "text-amber-700" : "text-muted-foreground",
        )}
      />
      <h2 className="mt-3 text-lg font-bold">Tasdiqlanish kutilmoqda</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {booking.barberName} broningizni ko&apos;rib chiqmoqda
      </p>
      {countdown.isUpcoming ? (
        <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-amber-950">
          {countdown.label}
        </p>
      ) : null}
      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {dateStr} · {timeStr} · {formatPrice(booking.price)}
      </p>
    </section>
  );
}
