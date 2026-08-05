import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { resolveMapsApiKey } from "../../lib/maps-key";
import { LIGHT_MAP_STYLE } from "./mapStyles";

export const DEFAULT_MAP_REGION = {
  latitude: 41.3111,
  longitude: 69.2797,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

export type OnboardingMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  panTo: (lat: number, lng: number) => void;
};

type Props = {
  latitude: number;
  longitude: number;
  onCoordsChange: (lat: number, lng: number) => void;
};

type GoogleMapInstance = {
  setCenter: (c: { lat: number; lng: number }) => void;
  panTo: (c: { lat: number; lng: number }) => void;
  setOptions: (opts: Record<string, unknown>) => void;
  getZoom: () => number | undefined;
  setZoom: (z: number) => void;
  getCenter: () => { lat: () => number; lng: () => number } | undefined;
  addListener: (event: string, fn: () => void) => { remove: () => void };
};

type GoogleMapsNs = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapInstance;
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsNs };
    __mysaloonMapsReady?: Promise<GoogleMapsNs>;
  }
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsNs> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (window.__mysaloonMapsReady) return window.__mysaloonMapsReady;

  window.__mysaloonMapsReady = new Promise<GoogleMapsNs>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-mysaloon-maps]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error("Maps load failed"));
      });
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

/** Web — doim ochiq (light) xarita; POI bosilmaydi. */
export const OnboardingMap = forwardRef<OnboardingMapHandle, Props>(
  function OnboardingMap({ latitude, longitude, onCoordsChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<GoogleMapInstance | null>(null);
    const skipRef = useRef(false);
    const onCoordsRef = useRef(onCoordsChange);
    onCoordsRef.current = onCoordsChange;
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        const map = mapRef.current;
        if (!map) return;
        map.setZoom(Math.min((map.getZoom() ?? 15) + 1, 20));
      },
      zoomOut: () => {
        const map = mapRef.current;
        if (!map) return;
        map.setZoom(Math.max((map.getZoom() ?? 15) - 1, 3));
      },
      panTo: (lat, lng) => {
        const map = mapRef.current;
        if (!map) return;
        skipRef.current = true;
        map.panTo({ lat, lng });
      },
    }));

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      let cancelled = false;
      const listeners: Array<{ remove: () => void }> = [];

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
            center: { lat: latitude, lng: longitude },
            zoom: 16,
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
            styles: LIGHT_MAP_STYLE,
            backgroundColor: "#f5f5f5",
          });

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

          listeners.push(
            map.addListener("dragstart", () => {
              skipRef.current = false;
            }),
          );
          listeners.push(
            map.addListener("idle", () => {
              if (skipRef.current) {
                skipRef.current = false;
                return;
              }
              const c = map.getCenter();
              if (!c) return;
              onCoordsRef.current(c.lat(), c.lng());
            }),
          );

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
        for (const l of listeners) {
          try {
            l.remove();
          } catch {
            /* ignore */
          }
        }
        mapRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#f5f5f5",
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
              color: "#444",
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
  },
);
