import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Salon, Service } from "@/lib/mock-data";
import { groupSalonServicesByBarber, resolveDefaultSalonBarberId } from "@/lib/salon-services";
import { resolveServiceImageUrl } from "@/lib/service-image";
import { shortPrice } from "@/lib/price-display";
import { cn } from "@/lib/utils";

function ServiceCard({
  service,
  salonId,
  bookingBarberId,
}: {
  service: Service;
  salonId: string;
  bookingBarberId?: string;
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const image = failed ? resolveServiceImageUrl() : resolveServiceImageUrl(service.imageUrl);

  return (
    <Link
      to="/booking/$salonId"
      params={{ salonId }}
      search={bookingBarberId ? { barber: bookingBarberId } : undefined}
      className="group block min-w-0 overflow-hidden rounded-[1.25rem] bg-white shadow-[0_8px_28px_-14px_rgba(0,0,0,0.16)] active:opacity-95"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition duration-500 group-active:scale-[1.02]"
        />
      </div>
      <div className="space-y-1 px-3 py-3">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
          {service.name}
        </h3>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3 shrink-0" />
          {service.duration} {t("salon.minutes")}
        </p>
        <p className="text-[13px] font-bold tabular-nums text-foreground">
          {shortPrice(service.price)}
        </p>
      </div>
    </Link>
  );
}

export function SalonMobileServicesGrid({ salon }: { salon: Salon }) {
  const { t } = useTranslation();
  const serviceGroups = groupSalonServicesByBarber(salon.services);
  const ownerBarberId = salon.ownerId ?? resolveDefaultSalonBarberId(salon.staff) ?? undefined;

  return (
    <div className="space-y-5">
      {serviceGroups.map((group) => {
        const bookingBarberId = group.barberId ?? ownerBarberId;
        const groupTitle = group.barberId
          ? group.barberName ?? t("salon.staff.title", { defaultValue: "Usta" })
          : t("salon.services.salonCatalog", { defaultValue: "Salon xizmatlari" });
        return (
          <div key={group.barberId ?? "salon-catalog"} className="space-y-3">
            {serviceGroups.length > 1 ? (
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {groupTitle}
              </h3>
            ) : null}
            <div className={cn("grid grid-cols-2 gap-3")}>
              {group.services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  salonId={salon.id}
                  bookingBarberId={bookingBarberId}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
