import { Link } from "@/navigation";
import { formatKm } from "@/lib/format";
import { RatingStars } from "./RatingStars";

export type PremiumBarber = {
  id: string;
  name: string;
  avatar: string;
  salonName?: string;
  bookingKind?: "independent" | "salon";
  salonId?: string;
  rating: number;
  reviewCount: number;
  distanceKm?: number;
  lat: number;
  lng: number;
};

export function BarberCardPremium({ barber, layout = "vertical" }: { barber: PremiumBarber; layout?: "vertical" | "horizontal" }) {
  const isSalonBooking = barber.bookingKind === "salon" && !!barber.salonId;

  if (layout === "horizontal") {
    const content = (
      <>
        <div className="relative">
          <img
            src={barber.avatar}
            alt={barber.name}
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-gold/30"
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-surface" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{barber.name}</h3>
          <p className="truncate text-xs text-muted-foreground">{barber.salonName}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <RatingStars value={barber.rating} count={barber.reviewCount} />
            {barber.distanceKm != null && (
              <span className="text-xs text-muted-foreground">· {formatKm(barber.distanceKm)}</span>
            )}
          </div>
        </div>
        <span className="rounded-full bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground transition group-hover:bg-foreground">Band qilish</span>
      </>
    );

    if (isSalonBooking) {
      return (
        <Link
          to="/booking/$salonId"
          params={{ salonId: barber.salonId! }}
          className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-3 shadow-soft transition active:scale-[0.99] hover:shadow-card hover:border-foreground/20"
        >
          {content}
        </Link>
      );
    }

    return (
      <Link
        to="/booking/barber/$barberId"
        params={{ barberId: barber.id }}
        className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-3 shadow-soft transition active:scale-[0.99] hover:shadow-card hover:border-foreground/20"
      >
        {content}
      </Link>
    );
  }

  const content = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden">
        <img src={barber.avatar} alt={barber.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute inset-x-3 bottom-3 text-white">
          <h3 className="truncate text-sm font-bold drop-shadow">{barber.name}</h3>
          <p className="mt-0.5 truncate text-[10px] text-white/85">{barber.salonName}</p>
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-foreground">
            ★ {barber.rating.toFixed(1)}
          </div>
        </div>
      </div>
    </>
  );

  if (isSalonBooking) {
    return (
      <Link
        to="/booking/$salonId"
        params={{ salonId: barber.salonId! }}
        className="group relative block w-44 shrink-0 overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-card transition active:scale-[0.98] hover:shadow-luxury"
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      to="/booking/barber/$barberId"
      params={{ barberId: barber.id }}
      className="group relative block w-44 shrink-0 overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-card transition active:scale-[0.98] hover:shadow-luxury"
    >
      {content}
    </Link>
  );
}
