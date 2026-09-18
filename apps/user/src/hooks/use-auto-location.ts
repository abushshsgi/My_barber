import { getAccuratePosition } from "@/lib/native-geolocation";
import { useEffect, useRef } from "react";
import { useMe, useUpdateMe } from "@/hooks/use-me";
import { validateLocation } from "@/lib/api/geo";
import { roundCoord } from "@/lib/api/list-utils";
import { hasValidUserSession } from "@/lib/api/client";

/**
 * Login qilgan, lekin profilda joylashuv bo‘lmagan foydalanuvchi uchun
 * GPS orqali viloyat va koordinatalarni avtomatik to‘ldirish.
 */
export function useAutoLocationSync() {
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const attempted = useRef(false);

  useEffect(() => {
    if (!hasValidUserSession() || !me || attempted.current) return;

    if (me.require_profile_location !== true) return;

    const needsLocation =
      !me.region?.trim() || me.latitude == null || me.longitude == null;
    if (!needsLocation) return;

    attempted.current = true;

    void (async () => {
      try {
        const pos = await getAccuratePosition({
          enableHighAccuracy: true,
          desiredAccuracyMeters: 80,
          maxWatchMs: 10_000,
          maximumAge: 120_000,
        });
        const lat = roundCoord(pos.lat);
        const lng = roundCoord(pos.lng);
        let region: string | undefined = me.region?.trim() || undefined;
        try {
          const v = await validateLocation(lat, lng);
          if (v.region_from_gps) region = v.region_from_gps;
        } catch {
          /* geo/validate ochiq — tarmoq xatosi profilni bloklamasin */
        }
        await updateMe.mutateAsync({
          latitude: lat,
          longitude: lng,
          ...(region ? { region } : {}),
        });
      } catch {
        /* GPS rad etilgan — butun UZ katalogi ko‘rinadi */
      }
    })();
  }, [me, updateMe]);
}
