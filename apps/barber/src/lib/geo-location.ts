import { toast } from "sonner";
import { getAccuratePosition, GeolocationError } from "@mybarber/shared/geolocation";
import { reverseGeocodeAddress } from "@/lib/api/geo";

export type GpsLocationSetters = {
  setLatitude: (value: string) => void;
  setLongitude: (value: string) => void;
  setAddress?: (value: string) => void;
  setCity?: (value: string) => void;
};

/** Browser GPS → koordinata + backend reverse geocode (shahar, ko'cha). */
export function requestGpsLocation(setters: GpsLocationSetters): void {
  void (async () => {
    try {
      const pos = await getAccuratePosition({
        enableHighAccuracy: true,
        desiredAccuracyMeters: 40,
        maxWatchMs: 12_000,
        maximumAge: 0,
        timeout: 15_000,
      });
      const lat = pos.lat;
      const lng = pos.lng;
      setters.setLatitude(lat.toFixed(6));
      setters.setLongitude(lng.toFixed(6));
      try {
        const result = await reverseGeocodeAddress(lat, lng);
        if (!result) {
          toast.error("Manzil aniqlanmadi. Shahar va ko'chani qo'lda kiriting.");
          return;
        }
        setters.setAddress?.(result.address);
        if (result.city) setters.setCity?.(result.city);
        toast.success("Joylashuv aniqlandi");
      } catch {
        toast.error("Manzil aniqlanmadi. Shahar va ko'chani qo'lda kiriting.");
      }
    } catch (err) {
      const message =
        err instanceof GeolocationError
          ? err.message
          : "GPS joylashuvni aniqlab bo'lmadi. Qayta urinib ko'ring.";
      toast.error(message);
    }
  })();
}
