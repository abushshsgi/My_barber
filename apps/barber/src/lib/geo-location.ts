import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getFastPosition, GeolocationError } from "@mybarber/shared/geolocation";
import { reverseGeocodeAddress } from "@/lib/api/geo";

export type GpsLocationSetters = {
  setLatitude: (value: string) => void;
  setLongitude: (value: string) => void;
  setAddress?: (value: string) => void;
  setCity?: (value: string) => void;
};

export type RequestGpsOptions = {
  /** Toast ko‘rsatish (default true). Auto-detect da false qilish mumkin. */
  notify?: boolean;
  /** Muvaffaqiyat toast (default: notify). */
  successToast?: boolean;
};

let inFlight: Promise<boolean> | null = null;

/**
 * Browser GPS → darhol pin, keyin reverse geocode (shahar/ko‘cha).
 * Tez strategiya: cache/network → high-accuracy race.
 */
export async function requestGpsLocationAsync(
  setters: GpsLocationSetters,
  options: RequestGpsOptions = {},
): Promise<boolean> {
  const notify = options.notify !== false;
  const successToast = options.successToast ?? notify;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const pos = await getFastPosition({
        enableHighAccuracy: true,
        desiredAccuracyMeters: 120,
        maximumAge: 120_000,
        timeout: 8_000,
      });
      const lat = pos.lat;
      const lng = pos.lng;
      // Pin darhol — manzil matni keyin to‘ldiriladi.
      setters.setLatitude(lat.toFixed(6));
      setters.setLongitude(lng.toFixed(6));

      try {
        const result = await reverseGeocodeAddress(lat, lng);
        if (result) {
          if (result.address) setters.setAddress?.(result.address);
          if (result.city) setters.setCity?.(result.city);
          if (successToast) toast.success("Joylashuv aniqlandi");
          return true;
        }
        if (notify) {
          toast.message("Joylashuv aniqlandi. Shahar/ko‘chani tekshirib qo‘ying.");
        }
        return true;
      } catch {
        if (notify) {
          toast.message("Joylashuv aniqlandi. Manzilni qo‘lda to‘ldiring.");
        }
        return true;
      }
    } catch (err) {
      if (notify) {
        const message =
          err instanceof GeolocationError
            ? err.message
            : "GPS joylashuvni aniqlab bo'lmadi. Qayta urinib ko'ring.";
        toast.error(message);
      }
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** @deprecated requestGpsLocationAsync ishlatish mumkin; sync wrapper saqlanadi. */
export function requestGpsLocation(
  setters: GpsLocationSetters,
  options?: RequestGpsOptions,
): void {
  void requestGpsLocationAsync(setters, options);
}

/**
 * Location step ochilganda — agar pin yo‘q bo‘lsa GPS ni avtomatik ishga tushiradi.
 */
export function useAutoGpsOnMount(
  setters: GpsLocationSetters,
  hasCoords: boolean,
  enabled = true,
): { locating: boolean; retry: () => void } {
  const [locating, setLocating] = useState(false);
  const attemptedRef = useRef(false);
  const settersRef = useRef(setters);
  settersRef.current = setters;

  const run = useCallback(
    (opts?: RequestGpsOptions) => {
      setLocating(true);
      void requestGpsLocationAsync(settersRef.current, opts).finally(() => {
        setLocating(false);
      });
    },
    [],
  );

  useEffect(() => {
    if (!enabled || hasCoords || attemptedRef.current) return;
    attemptedRef.current = true;
    run({ notify: true, successToast: true });
  }, [enabled, hasCoords, run]);

  return {
    locating,
    retry: () => run({ notify: true, successToast: true }),
  };
}
