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

const PREVIEW_COUNT = 6;

export function SalonAmenitiesSection({ amenities }: { amenities: SalonAmenity[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!amenities.length) return null;

  const preview = amenities.slice(0, PREVIEW_COUNT);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">{t("salon.amenities.title")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        {preview.map((item) => {
          const Icon = amenityIcon(item.icon);
          return (
            <div key={item.code} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          );
        })}
      </div>
      {amenities.length > PREVIEW_COUNT ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-bold underline underline-offset-4"
        >
          {t("salon.amenities.showAll", { count: amenities.length })}
        </button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("salon.amenities.title")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {amenities.map((item) => {
              const Icon = amenityIcon(item.icon);
              return (
                <div key={item.code} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
