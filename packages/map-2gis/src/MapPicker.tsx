/// <reference path="../../../node_modules/@2gis/mapgl/global.d.ts" />

import { useEffect, useRef } from "react";
import { load } from "@2gis/mapgl";
import { resolveDgisApiKey } from "./api-key";
import { fromMapGlCoords, TASHKENT_CENTER, toMapGlCoords } from "./constants";

export type MapPickerProps = {
  lat?: number | null;
  lng?: number | null;
  zoom?: number;
  onCoordsChange: (lat: number, lng: number) => void;
  className?: string;
  style?: React.CSSProperties;
};

function isUsableMap(map: mapgl.Map | null | undefined): map is mapgl.Map {
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
  const mapRef = useRef<mapgl.Map | null>(null);
  const onCoordsRef = useRef(onCoordsChange);
  const skipMoveRef = useRef(false);
  const lastSyncedRef = useRef<{ lat: number; lng: number } | null>(null);

  onCoordsRef.current = onCoordsChange;

  const initialLat = lat ?? TASHKENT_CENTER.lat;
  const initialLng = lng ?? TASHKENT_CENTER.lng;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    let map: mapgl.Map | undefined;

    void (async () => {
      const apiKey = await resolveDgisApiKey();
      if (destroyed || !containerRef.current || !apiKey) return;

      const mapglAPI = await load();
      if (destroyed || !containerRef.current) return;

      map = new mapglAPI.Map(containerRef.current, {
        center: toMapGlCoords(initialLat, initialLng),
        zoom,
        key: apiKey,
        zoomControl: true,
        enableTrackResize: true,
        disableRotationByUserInteraction: true,
        disablePitchByUserInteraction: true,
      });

      if (destroyed) {
        map.destroy();
        return;
      }

      mapRef.current = map;
      lastSyncedRef.current = { lat: initialLat, lng: initialLng };

      map.on("moveend", () => {
        if (skipMoveRef.current) {
          skipMoveRef.current = false;
          return;
        }
        if (!isUsableMap(map)) return;
        try {
          const center = map.getCenter();
          const { lat: nextLat, lng: nextLng } = fromMapGlCoords(center);
          lastSyncedRef.current = { lat: nextLat, lng: nextLng };
          onCoordsRef.current(nextLat, nextLng);
        } catch {
          // Map destroyed mid-gesture (Strict Mode / remount).
        }
      });
    })();

    return () => {
      destroyed = true;
      const active = map ?? mapRef.current;
      mapRef.current = null;
      try {
        active?.destroy();
      } catch {
        // ignore double-destroy
      }
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
      map.setCenter(toMapGlCoords(lat, lng), { animate: true, duration: 400 });
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
