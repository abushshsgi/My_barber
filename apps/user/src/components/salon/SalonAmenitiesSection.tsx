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

function AmenityRow({ item, className }: { item: SalonAmenity; className?: string }) {
  const Icon = amenityIcon(item.icon);
  return (
    <div className={cn("flex items-center gap-4 py-2", className)}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
      </span>
      <span className="text-base text-foreground">{item.label}</span>
    </div>
  );
}

export function SalonAmenitiesSection({
  amenities,
  variant = "salon",
}: {
  amenities: SalonAmenity[];
  variant?: "solo_studio" | "salon";
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!amenities.length) return null;

  const preview = amenities.slice(0, PREVIEW_COUNT);
  const hasMore = amenities.length > PREVIEW_COUNT;
  const titleKey =
    variant === "solo_studio" ? "salon.amenities.titleStudio" : "salon.amenities.title";

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">{t(titleKey)}</h2>

      <div className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
        {preview.map((item) => (
          <AmenityRow key={item.code} item={item} />
        ))}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-border bg-muted/40 px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
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
