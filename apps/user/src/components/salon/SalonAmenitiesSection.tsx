import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SalonAmenity } from "@/lib/mock-data";
import { amenityIcon } from "@/lib/amenity-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PREVIEW_COUNT = 10;

function AmenityRow({
  item,
  className,
  compact,
}: {
  item: SalonAmenity;
  className?: string;
  compact?: boolean;
}) {
  const Icon = amenityIcon(item.icon);
  return (
    <div className={cn("flex items-center", compact ? "gap-2.5 py-1.5" : "gap-4 py-2", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-lg bg-muted",
          compact ? "h-8 w-8" : "h-10 w-10 rounded-xl",
        )}
      >
        <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5", "text-foreground")} strokeWidth={1.5} />
      </span>
      <span className={cn("text-foreground", compact ? "text-sm" : "text-base")}>{item.label}</span>
    </div>
  );
}

export function SalonAmenitiesSection({
  amenities,
  variant = "salon",
  compact = false,
}: {
  amenities: SalonAmenity[];
  variant?: "solo_studio" | "salon";
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!amenities.length) return null;

  const preview = amenities.slice(0, PREVIEW_COUNT);
  const hasMore = amenities.length > PREVIEW_COUNT;
  const titleKey =
    variant === "solo_studio" ? "salon.amenities.titleStudio" : "salon.amenities.title";

  return (
    <section className={compact ? "space-y-3" : "space-y-6"}>
      <h2 className={cn("font-semibold tracking-tight", compact ? "text-base" : "text-2xl")}>
        {t(titleKey)}
      </h2>

      <div className={cn("grid grid-cols-1 sm:grid-cols-2", compact ? "gap-x-6" : "gap-x-12")}>
        {preview.map((item) => (
          <AmenityRow key={item.code} item={item} compact={compact} />
        ))}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "rounded-xl border border-border bg-muted/40 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70",
            compact ? "px-3 py-2" : "px-5 py-3.5",
          )}
        >
          {t("salon.amenities.showAll", { count: amenities.length })}
        </button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-semibold">
              {t(titleKey)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {amenities.map((item) => (
              <AmenityRow key={item.code} item={item} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
