import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

/** Data URL — backend AI endpointlari uchun. */
export function toDataUrl(base64: string, mime = "image/jpeg"): string {
  if (base64.startsWith("data:")) return base64;
  return `data:${mime};base64,${base64}`;
}

function notify(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

async function fetchUriAsDataUrl(uri: string): Promise<string | null> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function assetToDataUrl(
  asset: ImagePicker.ImagePickerAsset,
): Promise<string | null> {
  if (asset.base64) {
    return toDataUrl(asset.base64, asset.mimeType || "image/jpeg");
  }
  if (asset.uri) {
    return fetchUriAsDataUrl(asset.uri);
  }
  return null;
}

let lastSelfieSource: "camera" | "gallery" | "" = "";

/** Last camera or gallery pick. Empty when the selfie did not come from these helpers. */
export function currentSelfieSource(): "camera" | "gallery" | "" {
  return lastSelfieSource;
}

function rememberSource(source: "camera" | "gallery") {
  lastSelfieSource = source;
}

function assertAssetFrame(asset: ImagePicker.ImagePickerAsset) {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  if (width <= 0 || height <= 0) return;
  if (Math.min(width, height) < 320) {
    throw new Error("Rasm juda kichik. Bosh va soch to‘liq ko‘rinadigan qilib qayta oling.");
  }
  if (width / height > 2.2 || height / width > 3.2) {
    throw new Error("Bosh kadrdan chiqib ketgan. Peshona va soch to‘liq ko‘rinadigan qilib qayta oling.");
  }
}

function isRetakeError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("qayta oling");
}

/** Asl kadr. Crop/zoom yo‘q — tahlil va natija o‘sha rasmni ko‘rsatadi. */
function pickerExtras() {
  return {
    quality: 0.92 as const,
    base64: true,
    allowsEditing: false,
  };
}

export async function pickSelfieFromGallery(): Promise<string | null> {
  try {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify("Ruxsat", "Galereyaga ruxsat bering.");
        return null;
      }
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      ...pickerExtras(),
    });

    if (res.canceled || !res.assets?.[0]) return null;
    assertAssetFrame(res.assets[0]);

    const dataUrl = await assetToDataUrl(res.assets[0]);
    if (!dataUrl) {
      notify("Xato", "Rasmni o‘qib bo‘lmadi. Boshqa fayl tanlang.");
      return null;
    }
    rememberSource("gallery");
    return dataUrl;
  } catch (err) {
    if (isRetakeError(err)) throw err;
    notify(
      "Galereya",
      err instanceof Error ? err.message : "Rasm tanlashda xatolik.",
    );
    return null;
  }
}

export async function pickSelfieFromCamera(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      // Brauzerda kamera capture — ruxsat so‘raladi; muvaffaqiyatsiz bo‘lsa galereya.
      try {
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          ...pickerExtras(),
          cameraType: ImagePicker.CameraType.front,
        });
        if (!res.canceled && res.assets?.[0]) {
          assertAssetFrame(res.assets[0]);
          const dataUrl = await assetToDataUrl(res.assets[0]);
          if (dataUrl) {
            rememberSource("camera");
            return dataUrl;
          }
        }
        if (res.canceled) return null;
      } catch (err) {
        if (isRetakeError(err)) throw err;
        /* fall through to gallery */
      }
      notify(
        "Kamera",
        "Brauzer kamerani ocholmadi. Galereyadan selfie tanlang.",
      );
      return pickSelfieFromGallery();
    }

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      notify("Ruxsat", "Kameraga ruxsat bering.");
      return null;
    }

    const res = await ImagePicker.launchCameraAsync({
      ...pickerExtras(),
      cameraType: ImagePicker.CameraType.front,
    });

    if (res.canceled || !res.assets?.[0]) return null;
    assertAssetFrame(res.assets[0]);

    const dataUrl = await assetToDataUrl(res.assets[0]);
    if (!dataUrl) {
      notify("Xato", "Selfie o‘qilmadi. Qayta urinib ko‘ring.");
      return null;
    }
    rememberSource("camera");
    return dataUrl;
  } catch (err) {
    if (isRetakeError(err)) throw err;
    notify(
      "Kamera",
      err instanceof Error ? err.message : "Kamerani ochib bo‘lmadi.",
    );
    return null;
  }
}
