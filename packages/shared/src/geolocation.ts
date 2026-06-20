export type GeolocationErrorCode = "unsupported" | "denied" | "timeout" | "unknown";

export class GeolocationError extends Error {
  code: GeolocationErrorCode;

  constructor(code: GeolocationErrorCode, message: string) {
    super(message);
    this.name = "GeolocationError";
    this.code = code;
  }
}

export type GeolocationPosition = {
  lat: number;
  lng: number;
  accuracy?: number;
};

function mapGeolocationError(err: GeolocationPositionError): GeolocationError {
  if (err.code === err.PERMISSION_DENIED) {
    return new GeolocationError(
      "denied",
      "Joylashuvga ruxsat bering yoki brauzer sozlamalaridan yoqing.",
    );
  }
  if (err.code === err.TIMEOUT) {
    return new GeolocationError(
      "timeout",
      "Joylashuvni aniqlash vaqti tugadi. Qayta urinib ko'ring.",
    );
  }
  return new GeolocationError("unknown", err.message || "Joylashuvni aniqlab bo'lmadi.");
}

/** Brauzer GPS — Promise asosida (barber app namunasidan). */
export function getCurrentPosition(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(
        new GeolocationError(
          "unsupported",
          "Brauzeringiz joylashuvni qo'llab-quvvatlamaydi.",
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(mapGeolocationError(err)),
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 18_000,
        maximumAge: options?.maximumAge ?? 0,
      },
    );
  });
}
