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

/** Webda allowsEditing ko‘pincha picker’ni buzadi. */
function pickerExtras() {
  if (Platform.OS === "web") {
    return {
      quality: 0.72 as const,
      base64: true,
      allowsEditing: false,
    };
  }
  return {
    quality: 0.72 as const,
    base64: true,
    allowsEditing: true,
    aspect: [3, 4] as [number, number],
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

    const dataUrl = await assetToDataUrl(res.assets[0]);
    if (!dataUrl) {
      notify("Xato", "Rasmni o‘qib bo‘lmadi. Boshqa fayl tanlang.");
      return null;
    }
    return dataUrl;
  } catch (err) {
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
          const dataUrl = await assetToDataUrl(res.assets[0]);
          if (dataUrl) return dataUrl;
        }
        if (res.canceled) return null;
      } catch {
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

    const dataUrl = await assetToDataUrl(res.assets[0]);
    if (!dataUrl) {
      notify("Xato", "Selfie o‘qilmadi. Qayta urinib ko‘ring.");
      return null;
    }
    return dataUrl;
  } catch (err) {
    notify(
      "Kamera",
      err instanceof Error ? err.message : "Kamerani ochib bo‘lmadi.",
    );
    return null;
  }
}
