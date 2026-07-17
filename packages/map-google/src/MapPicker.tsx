import { useEffect, useRef } from "react";
import "./google-maps-types";
import { resolveGoogleMapsApiKey } from "./api-key";
import { TASHKENT_CENTER } from "./constants";
import { loadGoogleMaps } from "./load-maps";

export type MapPickerProps = {
  lat?: number | null;
  lng?: number | null;
  zoom?: number;
  onCoordsChange: (lat: number, lng: number) => void;
  className?: string;
  style?: React.CSSProperties;
};

function isUsableMap(map: google.maps.Map | null | undefined): map is google.maps.Map {
  if (!map) return false;
  try {
    map.getCenter();
    return true;
  } catch {
    return false;
  }
}

export function MapPicker({
  lat,
  lng,
  zoom = 16,
  onCoordsChange,
  className,
  style,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const onCoordsRef = useRef(onCoordsChange);
  const skipMoveRef = useRef(false);
  const lastSyncedRef = useRef<{ lat: number; lng: number } | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);

  onCoordsRef.current = onCoordsChange;

  const initialLat = lat ?? TASHKENT_CENTER.lat;
  const initialLng = lng ?? TASHKENT_CENTER.lng;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    let map: google.maps.Map | undefined;

    void (async () => {
      const apiKey = await resolveGoogleMapsApiKey();
      if (destroyed || !containerRef.current || !apiKey) return;

      try {
        await loadGoogleMaps(apiKey);
        if (destroyed || !containerRef.current) return;

        map = new google.maps.Map(containerRef.current, {
          center: { lat: initialLat, lng: initialLng },
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
        });

        if (destroyed) return;

        mapRef.current = map;
        lastSyncedRef.current = { lat: initialLat, lng: initialLng };

        listenerRef.current = map.addListener("idle", () => {
          if (skipMoveRef.current) {
            skipMoveRef.current = false;
            return;
          }
          if (!isUsableMap(map)) return;
          try {
            const center = map.getCenter();
            if (!center) return;
            const nextLat = center.lat();
            const nextLng = center.lng();
            lastSyncedRef.current = { lat: nextLat, lng: nextLng };
            onCoordsRef.current(nextLat, nextLng);
          } catch {
            // Map destroyed mid-gesture (Strict Mode / remount).
          }
        });
      } catch (err) {
        console.error("[MapPicker] failed to load Google Maps", err);
      }
    })();

    return () => {
      destroyed = true;
      if (listenerRef.current && typeof google !== "undefined" && google?.maps?.event) {
        google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!isUsableMap(map) || lat == null || lng == null) return;

    const prev = lastSyncedRef.current;
    if (prev && Math.abs(prev.lat - lat) < 1e-6 && Math.abs(prev.lng - lng) < 1e-6) {
      return;
    }

    skipMoveRef.current = true;
    lastSyncedRef.current = { lat, lng };
    try {
      map.panTo({ lat, lng });
    } catch {
      skipMoveRef.current = false;
    }
  }, [lat, lng]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", ...style }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50% 50% 50% 0",
            background: "#141414",
            transform: "rotate(-45deg)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            border: "2px solid #faf8f5",
          }}
        />
      </div>
    </div>
  );
}
