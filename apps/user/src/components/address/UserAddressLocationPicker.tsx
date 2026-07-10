import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { GeolocationError, getCurrentPosition } from "@mybarber/shared/geolocation";
import { geocodeAddress, reverseGeocodeAddress, validateLocation } from "@/lib/api/geo";
import { cn } from "@/lib/utils";

const MapPicker = lazy(() =>
  import("@mybarber/map-2gis").then((m) => ({ default: m.MapPicker })),
);

const MIN_ADDRESS_FOR_GEOCODE = 5;
const MAP_DEBOUNCE_MS = 500;

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
  /** fill-empty: faqat region bo'sh bo'lsa (onboarding). always: manzil sahifasi. */
  regionSyncMode?: "fill-empty" | "always";
  /** Shahar tanlanmaguncha GPS va xarita bloklanadi. */
  requireRegion?: boolean;
  /** false: faqat xarita (onboarding — tashqi GPS tugmasi yo'q). */
  showGpsButton?: boolean;
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
  regionSyncMode = "fill-empty",
  requireRegion = false,
  showGpsButton = true,
  className,
  mapClassName,
}: Props) {
  const { t } = useTranslation();
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);
  const skipGeocodeRef = useRef(false);
  const skipReverseRef = useRef(false);
  const mapSyncTimerRef = useRef<number | null>(null);
  const [locating, setLocating] = useState(false);

  const suggestRegionFromGps = (code: string) => {
    if (!code || !onRegionSuggestion) return;
    if (regionSyncMode === "always" || !region) {
      onRegionSuggestion(code);
    }
  };

  useEffect(() => {
    const addressPart = address.trim();
    if (addressPart.length < MIN_ADDRESS_FOR_GEOCODE || skipGeocodeRef.current) {
      skipGeocodeRef.current = false;
      return;
    }
    const q = [regionLabel.trim(), addressPart].filter(Boolean).join(", ");
    const timer = window.setTimeout(() => {
      void geocodeAddress(q)
        .then((results) => {
          const first = results[0];
          if (!first) return;
          skipReverseRef.current = true;
          setLatitude(first.lat.toFixed(6));
          setLongitude(first.lng.toFixed(6));
          setAddress?.(first.full_name || first.address || address);
        })
        .catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [regionLabel, address, setLatitude, setLongitude, setAddress]);

  useEffect(
    () => () => {
      if (mapSyncTimerRef.current != null) {
        window.clearTimeout(mapSyncTimerRef.current);
      }
    },
    [],
  );

  const syncMapCoords = (nextLat: number, nextLng: number) => {
    if (mapSyncTimerRef.current != null) {
      window.clearTimeout(mapSyncTimerRef.current);
    }
    mapSyncTimerRef.current = window.setTimeout(() => {
      void reverseGeocodeAddress(nextLat, nextLng)
        .then((result) => {
          if (!result) return;
          setAddress?.(result.full_name || result.address);
        })
        .catch(() => undefined);
      void validateLocation(nextLat, nextLng, region || undefined)
        .then((v) => {
          if (v.region_from_gps) suggestRegionFromGps(v.region_from_gps);
        })
        .catch(() => undefined);
    }, MAP_DEBOUNCE_MS);
  };

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
    syncMapCoords(nextLat, nextLng);
  };

  const detectGps = async () => {
    if (requireRegion && !region) {
      toast.error(t("addresses.selectCityFirst", { defaultValue: "Avval shahar / viloyatni tanlang" }));
      return;
    }
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
        suggestRegionFromGps(validation.region_from_gps);
      }
      toast.success(t("addresses.gpsDetected", { defaultValue: "Joylashuv aniqlandi" }));
    } catch (e) {
      const msg =
        e instanceof GeolocationError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("addresses.gpsFailed", { defaultValue: "Joylashuvni aniqlab bo'lmadi" });
      toast.error(msg);
    } finally {
      setLocating(false);
    }
  };

  const regionMissing = requireRegion && !region;

  return (
    <div className={cn("space-y-2", className)}>
      {regionMissing ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/50 px-3 py-2.5 text-xs font-semibold text-muted-foreground">
          {t("addresses.mapNeedsCity", {
            defaultValue: "Xarita va GPS ishlashi uchun yuqorida shahar tanlang",
          })}
        </p>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border",
          regionMissing && "pointer-events-none opacity-50",
        )}
      >
        <Suspense
          fallback={
            <div className="flex h-44 items-center justify-center bg-muted/30 text-xs text-muted-foreground">
              {t("addresses.mapLoading", { defaultValue: "Xarita yuklanmoqda…" })}
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
      {showGpsButton ? (
        <button
          type="button"
          disabled={locating || regionMissing}
          onClick={() => void detectGps()}
          className="w-full rounded-xl border border-border bg-surface py-2.5 text-xs font-bold disabled:opacity-60"
        >
          {locating
            ? t("addresses.locating", { defaultValue: "Aniqlanmoqda…" })
            : t("addresses.detectGps", { defaultValue: "GPS orqali aniqlash" })}
        </button>
      ) : null}
    </div>
  );
}
