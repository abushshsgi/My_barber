import type { MapHandle } from "@mybarber/map-2gis";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { formatDistanceKm, haversineKm } from "@/lib/geo";
import { cn } from "@/lib/utils";

const Map2GIS = lazy(() =>
  import("@mybarber/map-2gis").then((m) => ({ default: m.Map2GIS })),
);

type Props = {
  lat: number;
  lng: number;
  address?: string;
  salonName?: string | null;
  className?: string;
};

export function BookingRouteMap({ lat, lng, address, salonName, className }: Props) {
  const mapHandleRef = useRef<MapHandle | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
    );
  }, []);

  const distanceKm =
    userPos != null ? haversineKm(userPos.lat, userPos.lng, lat, lng) : null;

  const mapsUrl =
    userPos != null
      ? `https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const fitRoute = useCallback(() => {
    const handle = mapHandleRef.current;
    if (!handle) return;
    const salon = { id: "salon", lat, lng, label: salonName || address || "Sartaroshxona" };
    if (userPos) {
      handle.fitMarkers([
        salon,
        { id: "user", lat: userPos.lat, lng: userPos.lng, label: "" },
      ]);
      return;
    }
    handle.fitMarkers([salon]);
  }, [address, lat, lng, salonName, userPos]);

  useEffect(() => {
    fitRoute();
  }, [fitRoute]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-xl bg-muted/30">
        <Suspense
          fallback={
            <div className="flex h-44 items-center justify-center text-xs text-muted-foreground sm:h-52">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Xarita yuklanmoqda…
            </div>
          }
        >
          <Map2GIS
            markers={[{ id: "salon", lat, lng, label: salonName || address || "Sartaroshxona" }]}
            showUserLocation={!!userPos}
            userLocation={userPos}
            autoFitMarkers={false}
            onMapReady={(handle) => {
              mapHandleRef.current = handle;
              fitRoute();
            }}
            className="h-44 sm:h-52"
          />
        </Suspense>

        {distanceKm != null ? (
          <div className="absolute left-3 top-3 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background shadow-sm">
            {formatDistanceKm(distanceKm)}
          </div>
        ) : geoLoading ? (
          <div className="absolute left-3 top-3 rounded-lg bg-background/90 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm">
            Masofa hisoblanmoqda…
          </div>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {salonName ? (
            <p className="font-medium text-foreground">{salonName}</p>
          ) : null}
          {address ? (
            <p className="mt-0.5 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>{address}</span>
            </p>
          ) : null}
          {userPos && distanceKm != null ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Joriy joyingizdan sartaroshxonagacha taxminan {formatDistanceKm(distanceKm)}
            </p>
          ) : null}
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Navigation className="size-4" />
          Yo'l
        </a>
      </div>
    </div>
  );
}
