import { Check, Clock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Service } from "@/lib/mock-data";
import { shortPrice } from "@/lib/price-display";
import { resolveServiceImageUrl } from "@/lib/service-image";
import { cn } from "@/lib/utils";

function ServiceSelectCard({
  service,
  selected,
  onToggle,
}: {
  service: Service;
  selected: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const image = failed ? resolveServiceImageUrl() : resolveServiceImageUrl(service.imageUrl);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative block min-w-0 overflow-hidden rounded-[1.25rem] bg-white text-left shadow-[0_8px_28px_-14px_rgba(0,0,0,0.16)] transition-all active:scale-[0.98]",
        selected && "ring-2 ring-foreground ring-offset-2",
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
        <div
          className={cn(
            "absolute right-2 top-2 grid size-7 place-items-center rounded-full border-2 transition-colors",
            selected
              ? "border-foreground bg-foreground text-background"
              : "border-white/80 bg-white/90 text-transparent",
          )}
        >
          {selected ? <Check className="size-4" strokeWidth={3} /> : null}
        </div>
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
    </button>
  );
}

export function BookingServiceSelectGrid({
  services,
  selectedIds,
  onToggle,
}: {
  services: Service[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {services.map((s) => (
        <ServiceSelectCard
          key={s.id}
          service={s}
          selected={selectedIds.includes(s.id)}
          onToggle={() => onToggle(s.id)}
        />
      ))}
    </div>
  );
}
