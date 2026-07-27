import { Link } from "@tanstack/react-router";
import { ChevronRight, Star, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Barber, Salon } from "@/lib/mock-data";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

function StaffChip({ barber, salonId }: { barber: Barber; salonId: string }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const avatar = resolveMediaUrl(barber.avatarUrl) ?? "";
  const showPhoto = Boolean(avatar) && !failed;
  const bookable = barber.isBookable !== false;

  const inner = (
    <div className="flex min-w-[11.5rem] max-w-[13rem] shrink-0 items-center gap-3 rounded-2xl border border-border bg-white px-3 py-3 shadow-[0_6px_20px_-12px_rgba(0,0,0,0.14)]">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
        {showPhoto ? (
          <img
            src={avatar}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <User className="size-5" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{barber.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{barber.role}</p>
        {barber.rating > 0 ? (
          <p className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium">
            <Star className="size-2.5 fill-foreground" />
            {barber.rating.toFixed(1)}
          </p>
        ) : null}
      </div>
      {bookable ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
    </div>
  );

  if (!bookable) {
    return (
      <div className="opacity-60" aria-disabled>
        {inner}
      </div>
    );
  }

  return (
    <Link
      to="/booking/$salonId"
      params={{ salonId }}
      search={{ barber: barber.id }}
      className="shrink-0 active:opacity-90"
    >
      {inner}
    </Link>
  );
}

export function SalonMobileStaffRow({ salon }: { salon: Salon }) {
  const { t } = useTranslation();
  if (salon.staff.length === 0) return null;

  return (
    <section id="salon-staff" className="scroll-mt-20 space-y-3 border-b border-border pb-5">
      <h2 className="text-base font-semibold tracking-tight">{t("salon.tabs.staff")}</h2>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-0.5">
        {salon.staff.map((barber) => (
          <StaffChip key={barber.id} barber={barber} salonId={salon.id} />
        ))}
      </div>
    </section>
  );
}
