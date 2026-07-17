import { lazy, Suspense } from "react";
import { cn } from "@/lib/utils";

const MapPicker = lazy(() =>
  import("@mybarber/map-google").then((m) => ({ default: m.MapPicker })),
);

type Props = {
  latitude: number;
  longitude: number;
  className?: string;
};

/** Read-only Google Maps preview for GPS-acquired coordinates. */
export function GpsLocationPreviewMap({ latitude, longitude, className }: Props) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border", className)}>
      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center bg-muted/30 text-xs text-muted-foreground sm:h-60">
            Xarita yuklanmoqda…
          </div>
        }
      >
        <MapPicker
          lat={latitude}
          lng={longitude}
          onCoordsChange={() => {}}
          className="h-40 sm:h-60 pointer-events-none opacity-95"
        />
      </Suspense>
    </div>
  );
}
