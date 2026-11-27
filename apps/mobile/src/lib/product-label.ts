import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import { toDataUrl } from "./selfie";

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

/** Mahsulot etiketkasi — orqa kamera, yuqori sifat, crop yo‘q. */
const LABEL_OPTS = {
  mediaTypes: ["images"] as ["images"],
  quality: 0.85 as const,
  base64: true,
  allowsEditing: false,
};

export type ScannerGalleryAsset = {
  uri: string;
  width: number | null;
  exifOrientation: number | null;
};

function readExifOrientation(
  exif: { Orientation?: unknown; orientation?: unknown } | null | undefined,
): number | null {
  if (!exif) return null;
  const raw = exif.Orientation ?? exif.orientation;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

/** Scanner gallery pick keeps the file URI so still-image decode can run before any upload. */
export async function pickScannerGalleryAsset(): Promise<ScannerGalleryAsset | null> {
  try {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify("Ruxsat", "Galereyaga ruxsat bering.");
        return null;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      ...LABEL_OPTS,
      base64: false,
      exif: true,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return null;
    const asset = res.assets[0];
    return {
      uri: asset.uri,
      width: typeof asset.width === "number" ? asset.width : null,
      exifOrientation: readExifOrientation(asset.exif),
    };
  } catch (err) {
    notify("Galereya", err instanceof Error ? err.message : "Rasm tanlashda xatolik.");
    return null;
  }
}

export async function pickProductLabelFromGallery(): Promise<string | null> {
  try {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify("Ruxsat", "Galereyaga ruxsat bering.");
        return null;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync(LABEL_OPTS);
    if (res.canceled || !res.assets?.[0]) return null;
    const dataUrl = await assetToDataUrl(res.assets[0]);
    if (!dataUrl) {
      notify("Xato", "Rasmni o‘qib bo‘lmadi.");
      return null;
    }
    return dataUrl;
  } catch (err) {
    notify("Galereya", err instanceof Error ? err.message : "Rasm tanlashda xatolik.");
    return null;
  }
}

export async function pickProductLabelFromCamera(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      try {
        const res = await ImagePicker.launchCameraAsync({
          ...LABEL_OPTS,
          cameraType: ImagePicker.CameraType.back,
        });
        if (!res.canceled && res.assets?.[0]) {
          const dataUrl = await assetToDataUrl(res.assets[0]);
          if (dataUrl) return dataUrl;
        }
        if (res.canceled) return null;
      } catch {
        /* fall through */
      }
      return pickProductLabelFromGallery();
    }

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      notify("Ruxsat", "Kameraga ruxsat bering.");
      return null;
    }

    const res = await ImagePicker.launchCameraAsync({
      ...LABEL_OPTS,
      cameraType: ImagePicker.CameraType.back,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    const dataUrl = await assetToDataUrl(res.assets[0]);
    if (!dataUrl) {
      notify("Xato", "Rasm o‘qilmadi.");
      return null;
    }
    return dataUrl;
  } catch (err) {
    notify("Kamera", err instanceof Error ? err.message : "Kamerani ochib bo‘lmadi.");
    return null;
  }
}
