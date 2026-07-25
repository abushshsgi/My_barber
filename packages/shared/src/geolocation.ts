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

export type GeolocationOptions = {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  /** Stop early once accuracy is at or below this (meters). Default 40. */
  desiredAccuracyMeters?: number;
  /** Max time to watch for a better fix (ms). Default 12_000. */
  maxWatchMs?: number;
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

function toPosition(pos: globalThis.GeolocationPosition): GeolocationPosition {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}

function assertGeolocationAvailable(): Geolocation {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new GeolocationError(
      "unsupported",
      "Brauzeringiz joylashuvni qo'llab-quvvatlamaydi.",
    );
  }
  return navigator.geolocation;
}

/** Single GPS fix (legacy). Prefer getAccuratePosition for onboarding. */
export function getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let geo: Geolocation;
    try {
      geo = assertGeolocationAvailable();
    } catch (e) {
      reject(e);
      return;
    }
    geo.getCurrentPosition(
      (pos) => resolve(toPosition(pos)),
      (err) => reject(mapGeolocationError(err)),
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 18_000,
        maximumAge: options?.maximumAge ?? 0,
      },
    );
  });
}

/**
 * Watch GPS briefly and keep the most accurate reading.
 * Resolves early when desiredAccuracyMeters is met; otherwise returns the best fix.
 */
export function getAccuratePosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let geo: Geolocation;
    try {
      geo = assertGeolocationAvailable();
    } catch (e) {
      reject(e);
      return;
    }

    const desiredAccuracy = options?.desiredAccuracyMeters ?? 40;
    const maxWatchMs = options?.maxWatchMs ?? 12_000;
    const enableHighAccuracy = options?.enableHighAccuracy ?? true;
    const maximumAge = options?.maximumAge ?? 0;

    let best: GeolocationPosition | null = null;
    let settled = false;
    let watchId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      if (watchId != null) geo.clearWatch(watchId);
      if (timer != null) clearTimeout(timer);
      resolve(result);
    };

    const fail = (err: GeolocationError) => {
      if (settled) return;
      settled = true;
      if (watchId != null) geo.clearWatch(watchId);
      if (timer != null) clearTimeout(timer);
      if (best) {
        resolve(best);
        return;
      }
      reject(err);
    };

    timer = setTimeout(() => {
      if (best) finish(best);
      else fail(new GeolocationError("timeout", "Joylashuvni aniqlash vaqti tugadi. Qayta urinib ko'ring."));
    }, maxWatchMs);

    watchId = geo.watchPosition(
      (pos) => {
        const next = toPosition(pos);
        if (
          !best ||
          (next.accuracy != null &&
            (best.accuracy == null || next.accuracy < best.accuracy))
        ) {
          best = next;
        }
        if (next.accuracy != null && next.accuracy <= desiredAccuracy) {
          finish(next);
        }
      },
      (err) => fail(mapGeolocationError(err)),
      {
        enableHighAccuracy,
        timeout: options?.timeout ?? maxWatchMs,
        maximumAge,
      },
    );
  });
}

/**
 * Salon / auth uchun tez GPS: avval cache/network (sekundlar ichida),
 * keyin high-accuracy. Birinchi foydali fix darhol qaytadi.
 */
export function getFastPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
  const softMaxAge = options?.maximumAge ?? 120_000;
  const hardTimeout = options?.timeout ?? 8_000;

  return new Promise((resolve, reject) => {
    let settled = false;
    let pending = 2;
    let lastError: GeolocationError | null = null;
    let watchStarted = false;

    const done = (pos: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      resolve(pos);
    };

    const noteFail = (err: unknown) => {
      if (err instanceof GeolocationError) {
        lastError = err;
        // Ruxsat yo‘q — darhol to‘xtatish.
        if (err.code === "denied" || err.code === "unsupported") {
          if (!settled) {
            settled = true;
            reject(err);
          }
          return;
        }
      }
      pending -= 1;
      if (!settled && pending <= 0 && !watchStarted) {
        startWatchFallback();
      }
    };

    const startWatchFallback = () => {
      if (settled || watchStarted) return;
      watchStarted = true;
      void getAccuratePosition({
        enableHighAccuracy: true,
        desiredAccuracyMeters: options?.desiredAccuracyMeters ?? 150,
        maxWatchMs: Math.min(5_000, hardTimeout),
        maximumAge: softMaxAge,
        timeout: Math.min(5_000, hardTimeout),
      })
        .then((pos) => done(pos))
        .catch((err) => {
          if (settled) return;
          settled = true;
          reject(
            err instanceof GeolocationError
              ? err
              : lastError ??
                  new GeolocationError(
                    "timeout",
                    "Joylashuvni aniqlash vaqti tugadi. Qayta urinib ko'ring.",
                  ),
          );
        });
    };

    // 1) Tez: past aniqlik + cache (Wi‑Fi / oxirgi GPS).
    void getCurrentPosition({
      enableHighAccuracy: false,
      timeout: Math.min(3_500, hardTimeout),
      maximumAge: softMaxAge,
    })
      .then((pos) => done(pos))
      .catch(noteFail);

    // 2) Parallel: yuqori aniqlik.
    void getCurrentPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: hardTimeout,
      maximumAge: Math.min(30_000, softMaxAge),
    })
      .then((pos) => done(pos))
      .catch(noteFail);

    // 3) Agar 2.5s ichida hech narsa kelmasa — qisqa watch.
    setTimeout(() => {
      if (!settled) startWatchFallback();
    }, 2_500);
  });
}
