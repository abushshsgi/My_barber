import { lazy, Suspense, useEffect, useRef } from "react";
import { geocodeAddress, reverseGeocodeAddress } from "@/lib/api/geo";
import { cn } from "@/lib/utils";

const MapPicker = lazy(() =>
  import("@mybarber/map-google").then((m) => ({ default: m.MapPicker })),
);

function parseCoord(value: string): number | null {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

type Props = {
  city?: string;
  address?: string;
  latitude: string;
  longitude: string;
  setLatitude: (value: string) => void;
  setLongitude: (value: string) => void;
  setAddress?: (value: string) => void;
  setCity?: (value: string) => void;
  className?: string;
  mapClassName?: string;
};

export function SalonLocationPicker({
  city = "",
  address = "",
  latitude,
  longitude,
  setLatitude,
  setLongitude,
  setAddress,
  setCity,
  className,
  mapClassName,
}: Props) {
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);
  const skipCityGeocodeRef = useRef(false);
  const skipAddressGeocodeRef = useRef(false);
  const skipReverseRef = useRef(false);
  const reverseTimerRef = useRef<number | null>(null);
  const prevCityRef = useRef(city);
  const prevAddressRef = useRef(address);

  // Shahar matni — faqat pin yo‘q bo‘lsa geocode (aks holda GPS/reverse pinni siljitadi).
  useEffect(() => {
    const c = city.trim();
    if (c.length < 2 || c === prevCityRef.current) {
      prevCityRef.current = c;
      return;
    }
    prevCityRef.current = c;
    if (skipCityGeocodeRef.current) {
      skipCityGeocodeRef.current = false;
      return;
    }
    if (lat != null && lng != null) return;

    const timer = window.setTimeout(() => {
      void geocodeAddress(`${c}, O'zbekiston`)
        .then((results) => {
          const first = results[0];
          if (!first) return;
          skipReverseRef.current = true;
          setLatitude(first.lat.toFixed(6));
          setLongitude(first.lng.toFixed(6));
          if (!address.trim() && first.address) {
            skipAddressGeocodeRef.current = true;
            setAddress?.(first.address);
          }
        })
        .catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [city, address, lat, lng, setLatitude, setLongitude, setAddress]);

  // Manzil — foydalanuvchi yozganda pinni yangilash.
  useEffect(() => {
    const addressPart = address.trim();
    if (addressPart.length < 5 || addressPart === prevAddressRef.current) {
      prevAddressRef.current = addressPart;
      return;
    }
    prevAddressRef.current = addressPart;
    if (skipAddressGeocodeRef.current) {
      skipAddressGeocodeRef.current = false;
      return;
    }
    const q = [city.trim(), addressPart].filter(Boolean).join(", ");
    const timer = window.setTimeout(() => {
      void geocodeAddress(q)
        .then((results) => {
          const first = results[0];
          if (!first) return;
          skipReverseRef.current = true;
          setLatitude(first.lat.toFixed(6));
          setLongitude(first.lng.toFixed(6));
          if (first.address) {
            skipAddressGeocodeRef.current = true;
            prevAddressRef.current = first.address.trim();
            setAddress?.(first.address);
          }
          if (first.city) {
            skipCityGeocodeRef.current = true;
            prevCityRef.current = first.city.trim();
            setCity?.(first.city);
          }
        })
        .catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [city, address, setLatitude, setLongitude, setAddress, setCity]);

  const handleCoordsChange = (nextLat: number, nextLng: number) => {
    if (skipReverseRef.current) {
      skipReverseRef.current = false;
      setLatitude(nextLat.toFixed(6));
      setLongitude(nextLng.toFixed(6));
      return;
    }
    skipCityGeocodeRef.current = true;
    skipAddressGeocodeRef.current = true;
    setLatitude(nextLat.toFixed(6));
    setLongitude(nextLng.toFixed(6));
    if (reverseTimerRef.current) window.clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = window.setTimeout(() => {
      void reverseGeocodeAddress(nextLat, nextLng).then((result) => {
        if (!result) return;
        skipAddressGeocodeRef.current = true;
        skipCityGeocodeRef.current = true;
        if (result.address) {
          prevAddressRef.current = result.address.trim();
          setAddress?.(result.address);
        }
        if (result.city) {
          prevCityRef.current = result.city.trim();
          setCity?.(result.city);
        }
      });
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (reverseTimerRef.current) window.clearTimeout(reverseTimerRef.current);
    };
  }, []);

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
          lat={lat}
          lng={lng}
          onCoordsChange={handleCoordsChange}
          className={cn("h-40 sm:h-60", mapClassName)}
        />
      </Suspense>
    </div>
  );
}
