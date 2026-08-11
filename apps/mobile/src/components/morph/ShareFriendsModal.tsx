import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createMorphAiLookShare } from "../../api/ai";
import { composeInstagramStoryImage, downloadDataUrl } from "../../lib/compose-instagram-story";
import { INSTAGRAM_CTA, pickInstagramHeadline } from "../../lib/morph-share-copy";
import { openTelegramShare, WEB_ORIGIN } from "../../lib/morph-share";

type Props = {
  visible: boolean;
  onClose: () => void;
  styleId: string;
  title: string;
  previewImage: string;
  userName?: string | null;
  userKey?: string | number | null;
  onError: (message: string) => void;
};

type Network = "instagram" | "telegram" | "tiktok" | "facebook";

async function resolveShareUrl(styleId: string, title: string, previewImage: string) {
  let pageUrl = `${WEB_ORIGIN}/morf-ai/look/${encodeURIComponent(styleId)}`;
  try {
    const created = await createMorphAiLookShare({
      style_id: styleId,
      title,
      after_image: previewImage,
    });
    pageUrl =
      created.share_page_url ||
      `${WEB_ORIGIN}/morf-ai/share/${encodeURIComponent(created.id)}`;
  } catch {
    /* look URL fallback */
  }
  return pageUrl;
}

export function ShareFriendsModal({
  visible,
  onClose,
  styleId,
  title,
  previewImage,
  userName,
  userKey,
  onError,
}: Props) {
  const [busy, setBusy] = useState<Network | "copy" | null>(null);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  const ensureLink = useCallback(async () => {
    if (link) return link;
    const next = await resolveShareUrl(styleId, title, previewImage);
    setLink(next);
    return next;
  }, [link, previewImage, styleId, title]);

  const onCopy = useCallback(async () => {
    setBusy("copy");
    try {
      const url = await ensureLink();
      await Clipboard.setStringAsync(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onError("Havolani nusxalab bo‘lmadi");
    } finally {
      setBusy(null);
    }
  }, [ensureLink, onError]);

  const onNetwork = useCallback(
    async (network: Network) => {
      setBusy(network);
      try {
        const url = await ensureLink();
        const text = `${title} — Morf AI da sinab ko‘ring`;
        if (network === "telegram") {
          await openTelegramShare(url, text);
          return;
        }
        if (network === "facebook") {
          await Linking.openURL(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          );
          return;
        }
        if (network === "tiktok") {
          await Clipboard.setStringAsync(`${text}\n${url}`);
          const opened = await Linking.openURL("https://www.tiktok.com/");
          if (!opened) onError("TikTok ochilmadi — havola nusxalandi");
          return;
        }

        const headline = pickInstagramHeadline({ userKey, userName });
        const story = await composeInstagramStoryImage({
          resultImageUrl: previewImage,
          styleTitle: title,
          headline,
          cta: INSTAGRAM_CTA,
        });
        await Clipboard.setStringAsync(url);
        await downloadDataUrl(story, "morf-ai-story.jpg");
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          try {
            const blob = await (await fetch(story)).blob();
            const file = new File([blob], "morf-ai-story.jpg", { type: "image/jpeg" });
            const can = navigator.canShare?.({ files: [file] }) ?? false;
            if (can) {
              await navigator.share({ files: [file] });
              return;
            }
          } catch {
            /* download + ochish */
          }
        }
        await Linking.openURL("https://www.instagram.com/");
      } catch (err) {
        onError(err instanceof Error ? err.message : "Ulashib bo‘lmadi");
      } finally {
        setBusy(null);
      }
    },
    [ensureLink, onError, previewImage, title, userKey, userName],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.head}>
            <Text style={styles.title}>Do‘stlarga ulashish</Text>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#0A0A0A" />
            </Pressable>
          </View>
          <Text style={styles.hint}>Ushbu lookni ulashing</Text>

          <View style={styles.row}>
            <NetBtn
              label="Instagram"
              color="#E1306C"
              icon="logo-instagram"
              busy={busy === "instagram"}
              onPress={() => void onNetwork("instagram")}
            />
            <NetBtn
              label="Telegram"
              color="#2AABEE"
              icon="paper-plane"
              busy={busy === "telegram"}
              onPress={() => void onNetwork("telegram")}
            />
            <NetBtn
              label="TikTok"
              color="#111111"
              icon="logo-tiktok"
              busy={busy === "tiktok"}
              onPress={() => void onNetwork("tiktok")}
            />
            <NetBtn
              label="Facebook"
              color="#1877F2"
              icon="logo-facebook"
              busy={busy === "facebook"}
              onPress={() => void onNetwork("facebook")}
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.copyLabel}>Havolani nusxalash</Text>
          <Pressable style={styles.copyRow} onPress={() => void onCopy()}>
            <Text style={styles.copyUrl} numberOfLines={1}>
              {link || `${WEB_ORIGIN}/morf-ai/look/${styleId}`}
            </Text>
            {busy === "copy" ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={18}
                color="#0A0A0A"
              />
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NetBtn({
  label,
  color,
  icon,
  busy,
  onPress,
}: {
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.net} onPress={onPress} disabled={busy}>
      <View style={[styles.netIcon, { backgroundColor: color }]}>
        {busy ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Ionicons name={icon} size={22} color="#FFF" />
        )}
      </View>
      <Text style={styles.netLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#0A0A0A" },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3F3",
  },
  hint: { marginTop: 8, fontSize: 13, color: "#737373", fontWeight: "600" },
  row: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  net: { width: 72, alignItems: "center", gap: 8 },
  netIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  netLabel: { fontSize: 11, fontWeight: "700", color: "#0A0A0A" },
  divider: {
    height: 1,
    backgroundColor: "#EFEFEF",
    marginTop: 18,
    marginBottom: 14,
  },
  copyLabel: { fontSize: 14, fontWeight: "800", color: "#0A0A0A", marginBottom: 8 },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  copyUrl: { flex: 1, fontSize: 12, color: "#525252" },
});
