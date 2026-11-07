import { useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { clearMyAvatar, uploadMyAvatar } from "../api/user";
import { useAuth } from "../auth/AuthContext";
import { useMorphAppearance } from "../lib/MorphAppearanceContext";

const MAX_BYTES = 5 * 1024 * 1024;

let cacheEpoch = 0;
const cacheListeners = new Set<() => void>();

function bumpAvatarCache() {
  cacheEpoch += 1;
  cacheListeners.forEach((fn) => fn());
}

/** Yuklangan rasm shu qurilmada darhol yangilansin, kesh eski URLni ushlab qolmasin. */
export function useAvatarCacheEpoch() {
  const [epoch, setEpoch] = useState(cacheEpoch);
  useEffect(() => {
    const fn = () => setEpoch(cacheEpoch);
    cacheListeners.add(fn);
    return () => {
      cacheListeners.delete(fn);
    };
  }, []);
  return epoch;
}

type ImageKind = "image/jpeg" | "image/png" | "image/webp";

function normalizeType(name: string, mime?: string | null): ImageKind | null {
  const raw = (mime || "").split(";")[0].trim().toLowerCase();
  if (raw === "image/jpg" || raw === "image/pjpeg" || raw === "image/jpeg") return "image/jpeg";
  if (raw === "image/png") return "image/png";
  if (raw === "image/webp") return "image/webp";
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

function fileMeta(name: string, mime?: string | null) {
  const type = normalizeType(name, mime);
  if (!type) return null;
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return { name: `avatar.${ext}`, type };
}

/** Brauzer fayl oynasini foydalanuvchi bosishining o‘zida ochadi. */
function pickWebFile(camera: boolean): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
    if (camera) input.setAttribute("capture", "environment");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener("change", () => finish(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

export function useAvatarPhoto(onUpdated?: () => void) {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuth();
  const { colors: pal } = useMorphAppearance();
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);

  const fail = (message: string) => {
    Alert.alert(t("profile.avatarError", { defaultValue: "Rasm yuklanmadi" }), message);
  };

  const sendBlob = async (blob: Blob, name: string, mime?: string | null) => {
    if (blob.size > MAX_BYTES) {
      fail(t("profile.avatarSize", { defaultValue: "Rasm 5 MB dan katta." }));
      return;
    }
    const meta = fileMeta(name, mime || blob.type);
    if (!meta) {
      fail(t("profile.avatarType", { defaultValue: "Faqat JPG, PNG yoki WEBP." }));
      return;
    }
    setBusy(true);
    try {
      await uploadMyAvatar({ uri: "", name: meta.name, type: meta.type, blob });
      await refreshMe();
      bumpAvatarCache();
      onUpdated?.();
    } catch (error) {
      fail(error instanceof Error ? error.message : t("profile.avatarError", { defaultValue: "Rasm yuklanmadi" }));
    } finally {
      setBusy(false);
    }
  };

  const sendUri = async (uri: string, mime?: string | null, size?: number | null) => {
    if (size && size > MAX_BYTES) {
      fail(t("profile.avatarSize", { defaultValue: "Rasm 5 MB dan katta." }));
      return;
    }
    const meta = fileMeta(uri, mime);
    if (!meta) {
      fail(t("profile.avatarType", { defaultValue: "Faqat JPG, PNG yoki WEBP." }));
      return;
    }
    setBusy(true);
    try {
      await uploadMyAvatar({ uri, name: meta.name, type: meta.type });
      await refreshMe();
      bumpAvatarCache();
      onUpdated?.();
    } catch (error) {
      fail(error instanceof Error ? error.message : t("profile.avatarError", { defaultValue: "Rasm yuklanmadi" }));
    } finally {
      setBusy(false);
    }
  };

  const pickNative = async (source: "library" | "camera") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      fail(t("profile.avatarDenied", { defaultValue: "Rasm uchun ruxsat kerak." }));
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await sendUri(asset.uri, asset.mimeType, asset.fileSize);
  };

  const choose = (source: "library" | "camera") => {
    if (Platform.OS === "web") {
      const pending = pickWebFile(source === "camera");
      setMenu(false);
      void pending.then((file) => {
        if (file) void sendBlob(file, file.name, file.type);
      });
      return;
    }
    setMenu(false);
    void pickNative(source);
  };

  const remove = async () => {
    setMenu(false);
    setBusy(true);
    try {
      await clearMyAvatar();
      await refreshMe();
      bumpAvatarCache();
      onUpdated?.();
    } catch (error) {
      fail(error instanceof Error ? error.message : t("profile.avatarError", { defaultValue: "Rasm yuklanmadi" }));
    } finally {
      setBusy(false);
    }
  };

  const openMenu = () => {
    if (busy) return;
    setMenu(true);
  };

  const picker = (
    <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessibilityLabel={t("common.cancel", { defaultValue: "Bekor" })} />
        <View style={[styles.sheet, { backgroundColor: pal.cardStrong }]}>
          <Text style={[styles.title, { color: pal.fg }]}>
            {t("profile.avatarPick", { defaultValue: "Profil rasmi" })}
          </Text>
          <Pressable style={styles.row} onPress={() => choose("library")} accessibilityRole="button">
            <Text style={[styles.rowText, { color: pal.fg }]}>
              {t("profile.avatarGallery", { defaultValue: "Galereya" })}
            </Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => choose("camera")} accessibilityRole="button">
            <Text style={[styles.rowText, { color: pal.fg }]}>
              {t("profile.avatarCamera", { defaultValue: "Kamera" })}
            </Text>
          </Pressable>
          {user?.avatar ? (
            <Pressable style={styles.row} onPress={() => void remove()} accessibilityRole="button">
              <Text style={[styles.rowText, styles.danger]}>
                {t("profile.avatarRemove", { defaultValue: "Rasmni o'chirish" })}
              </Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.row} onPress={() => setMenu(false)} accessibilityRole="button">
            <Text style={[styles.rowText, { color: pal.muted }]}>
              {t("common.cancel", { defaultValue: "Bekor" })}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return { busy, openMenu, picker };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },
  title: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 12,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  rowText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  danger: { color: "#FF453A" },
});
