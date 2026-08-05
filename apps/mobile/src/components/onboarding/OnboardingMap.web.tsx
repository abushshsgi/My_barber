import { useEffect, useRef, useState } from "react";
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "./mapStyles";

export const DEFAULT_MAP_REGION = {
  latitude: 41.3111,
  longitude: 69.2797,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

type Props = {
  latitude: number | null;
  longitude: number | null;
};

type GoogleMapInstance = {
  setCenter: (c: { lat: number; lng: number }) => void;
  setOptions: (opts: Record<string, unknown>) => void;
};

type GoogleMarkerInstance = {
  setMap: (map: unknown) => void;
  setPosition: (c: { lat: number; lng: number }) => void;
};

type GoogleMapsNs = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (opts: Record<string, unknown>) => GoogleMarkerInstance;
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsNs };
    __mysaloonMapsReady?: Promise<GoogleMapsNs>;
  }
}

function looksLikeKey(key: string): boolean {
  return key.startsWith("AIza") && key.length >= 30;
}

async function resolveMapsApiKey(): Promise<string> {
  const fromEnv = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
  if (looksLikeKey(fromEnv)) return fromEnv;
  try {
    const res = await fetch("/api/v1/geo/map-config/", { cache: "no-store" });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      google_maps_api_key?: string;
      dgis_api_key?: string;
    };
    const key = (data.google_maps_api_key || data.dgis_api_key || "").trim();
    return looksLikeKey(key) ? key : "";
  } catch {
    return "";
  }
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsNs> {
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }
  if (window.__mysaloonMapsReady) return window.__mysaloonMapsReady;

  window.__mysaloonMapsReady = new Promise<GoogleMapsNs>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-mysaloon-maps]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error("Maps load failed"));
      });
      existing.addEventListener("error", () => reject(new Error("Maps script error")));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.mysaloonMaps = "1";
    script.onload = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("Maps unavailable"));
    };
    script.onerror = () => reject(new Error("Maps script error"));
    document.head.appendChild(script);
  });

  return window.__mysaloonMapsReady;
}

function useSystemDark(): boolean {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return dark;
}

/**
 * Web — Google Maps JS (iframe emas):
 * - scroll/pinch zoom (CTRL shart emas)
 * - Google UI tugmalari o'chiq
 * - restoran/kafe POI bosilmaydi, kartochka yo'q
 * - telefon dark/light temasi
 */
export function OnboardingMap({ latitude, longitude }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dark = useSystemDark();

  const lat = latitude ?? DEFAULT_MAP_REGION.latitude;
  const lng = longitude ?? DEFAULT_MAP_REGION.longitude;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    void (async () => {
      try {
        const apiKey = await resolveMapsApiKey();
        if (cancelled) return;
        if (!apiKey) {
          setError("Xarita kaliti topilmadi");
          return;
        }
        const maps = await loadGoogleMaps(apiKey);
        if (cancelled || !containerRef.current) return;

        const map = new maps.Map(containerRef.current, {
          center: { lat, lng },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          scaleControl: false,
          rotateControl: false,
          keyboardShortcuts: false,
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: dark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
          backgroundColor: dark ? "#0e1626" : "#E8EEF4",
        });

        // Ortiqcha Google UI (klaviatura yordami va h.k.) — attribution qoladi.
        if (!document.getElementById("mysaloon-map-ui-hide")) {
          const style = document.createElement("style");
          style.id = "mysaloon-map-ui-hide";
          style.textContent = `
            .gm-bundled-control,
            .gm-fullscreen-control,
            button[title="Keyboard shortcuts"],
            button[aria-label="Keyboard shortcuts"],
            .gm-style-mtc,
            .gm-svpc { display: none !important; }
          `;
          document.head.appendChild(style);
        }

        mapRef.current = map;
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Xarita yuklanmadi");
        }
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
    // Map bir marta yaratiladi; tema/coords alohida effectlarda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({
      styles: dark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
      backgroundColor: dark ? "#0e1626" : "#E8EEF4",
    });
  }, [dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    map.setCenter({ lat, lng });

    if (latitude == null || longitude == null) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map,
        position: { lat, lng },
        clickable: false,
      });
    } else {
      markerRef.current.setPosition({ lat, lng });
      markerRef.current.setMap(map);
    }
  }, [lat, lng, latitude, longitude]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        backgroundColor: dark ? "#0e1626" : "#E8EEF4",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {error ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            color: dark ? "#ccc" : "#444",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
