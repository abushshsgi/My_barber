import { reverseGeocodeAddress } from "@/lib/api/geo";

export type GpsLocationSetters = {
  setLatitude: (value: string) => void;
  setLongitude: (value: string) => void;
  setAddress?: (value: string) => void;
  setCity?: (value: string) => void;
};

/** Browser GPS → koordinata + backend reverse geocode (shahar, ko'cha). */
export function requestGpsLocation(setters: GpsLocationSetters): void {
  if (!("geolocation" in navigator)) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setters.setLatitude(lat.toFixed(6));
      setters.setLongitude(lng.toFixed(6));
      void reverseGeocodeAddress(lat, lng).then((result) => {
        if (!result) return;
        setters.setAddress?.(result.address);
        if (result.city) setters.setCity?.(result.city);
      });
    },
    () => {},
    { enableHighAccuracy: true, timeout: 10000 },
  );
}
