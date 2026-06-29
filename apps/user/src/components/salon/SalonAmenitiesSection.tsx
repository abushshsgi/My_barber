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

type AmenityDisplay = "list" | "chips" | "grid" | "cards" | "inline";

function AmenityRow({ item, className }: { item: SalonAmenity; className?: string }) {
  const Icon = amenityIcon(item.icon);
  return (
    <div className={cn("flex items-center gap-4 py-2", className)}>
      <Icon className="h-6 w-6 shrink-0 text-foreground" strokeWidth={1.5} />
      <span className="text-base text-foreground">{item.label}</span>
    </div>
  );
}

export function SalonAmenitiesSection({
  amenities,
  variant = "salon",
  display = "list",
  titleClassName,
}: {
  amenities: SalonAmenity[];
  variant?: "solo_studio" | "salon";
  display?: AmenityDisplay;
  titleClassName?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!amenities.length) return null;

  const preview = amenities.slice(0, PREVIEW_COUNT);
  const hasMore = amenities.length > PREVIEW_COUNT;
  const titleKey =
    variant === "solo_studio" ? "salon.amenities.titleStudio" : "salon.amenities.title";
  const title = t(titleKey);

  const renderItems = () => {
    if (display === "chips") {
      return (
        <div className="flex flex-wrap gap-2">
          {preview.map((item) => {
            const Icon = amenityIcon(item.icon);
            return (
              <span
                key={item.code}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm font-medium"
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
              </span>
            );
          })}
        </div>
      );
    }
    if (display === "grid") {
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {preview.map((item) => {
            const Icon = amenityIcon(item.icon);
            return (
              <div
                key={item.code}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/20 p-3 text-center"
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-xs font-medium leading-tight">{item.label}</span>
              </div>
            );
          })}
        </div>
      );
    }
    if (display === "cards") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {preview.map((item) => {
            const Icon = amenityIcon(item.icon);
            return (
              <div
                key={item.code}
                className="flex items-center gap-3 rounded-2xl border border-border p-4 shadow-sm"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
            );
          })}
        </div>
      );
    }
    if (display === "inline") {
      return (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {preview.map((item) => {
            const Icon = amenityIcon(item.icon);
            return (
              <span
                key={item.code}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1 text-xs font-medium"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                {item.label}
              </span>
            );
          })}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
        {preview.map((item) => (
          <AmenityRow key={item.code} item={item} />
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <h2 className={titleClassName ?? "text-[22px] font-semibold tracking-tight"}>{title}</h2>
      {renderItems()}
      {hasMore ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-border bg-muted/40 px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
        >
          {t("salon.amenities.showAll", { count: amenities.length })}
        </button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-semibold">{title}</DialogTitle>
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
