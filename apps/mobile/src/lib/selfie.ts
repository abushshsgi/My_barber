import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

/** Data URL — backend AI endpointlari uchun. */
export function toDataUrl(base64: string, mime = "image/jpeg"): string {
  if (base64.startsWith("data:")) return base64;
  return `data:${mime};base64,${base64}`;
}

export async function pickSelfieFromGallery(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Ruxsat", "Galereyaga ruxsat bering.");
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.72,
    base64: true,
    allowsEditing: true,
    aspect: [3, 4],
  });
  if (res.canceled || !res.assets[0]?.base64) return null;
  const asset = res.assets[0];
  const mime = asset.mimeType || "image/jpeg";
  return toDataUrl(asset.base64!, mime);
}

export async function pickSelfieFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Ruxsat", "Kameraga ruxsat bering.");
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    quality: 0.72,
    base64: true,
    allowsEditing: true,
    aspect: [3, 4],
    cameraType: ImagePicker.CameraType.front,
  });
  if (res.canceled || !res.assets[0]?.base64) {
    // Web ba'zan base64 bermaydi — uri dan o'qiymiz.
    if (!res.canceled && res.assets[0]?.uri && Platform.OS === "web") {
      return fetchUriAsDataUrl(res.assets[0].uri);
    }
    return null;
  }
  const asset = res.assets[0];
  return toDataUrl(asset.base64!, asset.mimeType || "image/jpeg");
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
