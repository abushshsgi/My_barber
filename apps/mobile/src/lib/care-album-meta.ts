import AsyncStorage from "@react-native-async-storage/async-storage";

export type CareAlbumMetaItem = {
  product_ids: string[];
  product_names: string[];
  goal?: string;
};

export type CareAlbumMeta = Record<string, CareAlbumMetaItem>;

const META_KEY_PREFIX = "mysaloon.care.album.meta";

export function careAlbumMetaKey(userId: number | null | undefined): string {
  return `${META_KEY_PREFIX}:${userId ?? "guest"}`;
}

export async function readCareAlbumMeta(
  userId: number | null | undefined,
): Promise<CareAlbumMeta> {
  try {
    const raw = await AsyncStorage.getItem(careAlbumMetaKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CareAlbumMeta;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveCareAlbumMeta(
  userId: number | null | undefined,
  meta: CareAlbumMeta,
): Promise<void> {
  try {
    await AsyncStorage.setItem(careAlbumMetaKey(userId), JSON.stringify(meta));
  } catch {
    /* noop */
  }
}
