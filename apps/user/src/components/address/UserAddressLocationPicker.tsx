import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GeolocationError, getCurrentPosition } from "@mybarber/shared/geolocation";
import { geocodeAddress, reverseGeocodeAddress, validateLocation } from "@/lib/api/geo";
import { cn } from "@/lib/utils";

const MapPicker = lazy(() =>
  import("@mybarber/map-2gis").then((m) => ({ default: m.MapPicker })),
);

function parseCoord(value: string): number | null {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

type Props = {
  region?: string;
  regionLabel?: string;
  address?: string;
  latitude: string;
  longitude: string;
  setLatitude: (value: string) => void;
  setLongitude: (value: string) => void;
  setAddress?: (value: string) => void;
  onRegionSuggestion?: (regionCode: string) => void;
  className?: string;
  mapClassName?: string;
};

export function UserAddressLocationPicker({
  region = "",
  regionLabel = "",
  address = "",
  latitude,
  longitude,
  setLatitude,
  setLongitude,
  setAddress,
  onRegionSuggestion,
  className,
  mapClassName,
}: Props) {
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);
  const skipGeocodeRef = useRef(false);
  const skipReverseRef = useRef(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const q = [regionLabel.trim(), address.trim()].filter(Boolean).join(", ");
    if (q.length < 4 || skipGeocodeRef.current) {
      skipGeocodeRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void geocodeAddress(q).then((results) => {
        const first = results[0];
        if (!first) return;
        skipReverseRef.current = true;
        setLatitude(first.lat.toFixed(6));
        setLongitude(first.lng.toFixed(6));
        setAddress?.(first.full_name || first.address || address);
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [regionLabel, address, setLatitude, setLongitude, setAddress]);

  const handleCoordsChange = (nextLat: number, nextLng: number) => {
    if (skipReverseRef.current) {
      skipReverseRef.current = false;
      setLatitude(nextLat.toFixed(6));
      setLongitude(nextLng.toFixed(6));
      return;
    }
    skipGeocodeRef.current = true;
    setLatitude(nextLat.toFixed(6));
    setLongitude(nextLng.toFixed(6));
    void reverseGeocodeAddress(nextLat, nextLng).then((result) => {
      if (!result) return;
      setAddress?.(result.full_name || result.address);
    });
    void validateLocation(nextLat, nextLng, region || undefined).then((v) => {
      if (v.region_from_gps) onRegionSuggestion?.(v.region_from_gps);
    });
  };

  const detectGps = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setLatitude(pos.lat.toFixed(6));
      setLongitude(pos.lng.toFixed(6));
      const result = await reverseGeocodeAddress(pos.lat, pos.lng);
      if (result) {
        setAddress?.(result.full_name || result.address);
      }
      const validation = await validateLocation(pos.lat, pos.lng, region || undefined);
      if (validation.region_from_gps) {
        onRegionSuggestion?.(validation.region_from_gps);
      }
      toast.success("Joylashuv aniqlandi");
    } catch (e) {
      const msg =
        e instanceof GeolocationError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Joylashuvni aniqlab bo'lmadi";
      toast.error(msg);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-2xl border border-border">
        <Suspense
          fallback={
            <div className="flex h-44 items-center justify-center bg-muted/30 text-xs text-muted-foreground">
              Xarita yuklanmoqda…
            </div>
          }
        >
          <MapPicker
            lat={lat}
            lng={lng}
            onCoordsChange={handleCoordsChange}
            className={cn("h-44 sm:h-52", mapClassName)}
          />
        </Suspense>
      </div>
      <button
        type="button"
        disabled={locating}
        onClick={() => void detectGps()}
        className="w-full rounded-xl border border-border bg-surface py-2.5 text-xs font-bold disabled:opacity-60"
      >
        {locating ? "Aniqlanmoqda…" : "GPS orqali aniqlash"}
      </button>
    </div>
  );
}
