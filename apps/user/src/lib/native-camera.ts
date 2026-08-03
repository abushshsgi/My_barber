import { Capacitor } from "@capacitor/core";

/** getUserMedia oldidan Android CAMERA ruxsatini so‘rash. */
export async function ensureCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const { Camera } = await import("@capacitor/camera");
    const status = await Camera.checkPermissions();
    if (status.camera === "granted") return true;
    const next = await Camera.requestPermissions({ permissions: ["camera"] });
    return next.camera === "granted";
  } catch {
    return true;
  }
}
