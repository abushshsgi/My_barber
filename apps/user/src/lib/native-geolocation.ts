import { Capacitor } from "@capacitor/core";
import {
  GeolocationError,
  getAccuratePosition as webAccurate,
  getCurrentPosition as webCurrent,
  getFastPosition as webFast,
  type GeolocationOptions,
  type GeolocationPosition,
} from "@mybarber/shared/geolocation";

export { GeolocationError };
export type { GeolocationOptions, GeolocationPosition };

function mapCapError(err: unknown): GeolocationError {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const lower = message.toLowerCase();
  if (lower.includes("denied") || lower.includes("permission")) {
    return new GeolocationError(
      "denied",
      "Joylashuvga ruxsat bering yoki ilova sozlamalaridan yoqing.",
    );
  }
  if (lower.includes("timeout")) {
    return new GeolocationError(
      "timeout",
      "Joylashuvni aniqlash vaqti tugadi. Qayta urinib ko'ring.",
    );
  }
  return new GeolocationError("unknown", message || "Joylashuvni aniqlab bo'lmadi.");
}

async function nativeCurrent(options?: GeolocationOptions): Promise<GeolocationPosition> {
  const { Geolocation } = await import("@capacitor/geolocation");
  const status = await Geolocation.checkPermissions();
  if (status.location !== "granted" && status.coarseLocation !== "granted") {
    const next = await Geolocation.requestPermissions();
    if (next.location !== "granted" && next.coarseLocation !== "granted") {
      throw new GeolocationError(
        "denied",
        "Joylashuvga ruxsat bering yoki ilova sozlamalaridan yoqing.",
      );
    }
  }
  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 18_000,
      maximumAge: options?.maximumAge ?? 0,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch (err) {
    throw mapCapError(err);
  }
}

export function getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
  if (Capacitor.isNativePlatform()) return nativeCurrent(options);
  return webCurrent(options);
}

export function getAccuratePosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
  if (Capacitor.isNativePlatform()) {
    return nativeCurrent({
      ...options,
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.maxWatchMs ?? options?.timeout ?? 12_000,
    });
  }
  return webAccurate(options);
}

export function getFastPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
  if (Capacitor.isNativePlatform()) {
    return nativeCurrent({
      ...options,
      enableHighAccuracy: false,
      timeout: options?.timeout ?? 8_000,
      maximumAge: options?.maximumAge ?? 120_000,
    }).catch(() =>
      nativeCurrent({
        ...options,
        enableHighAccuracy: true,
        timeout: options?.timeout ?? 8_000,
      }),
    );
  }
  return webFast(options);
}
