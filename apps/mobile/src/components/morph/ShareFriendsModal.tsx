import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createMorphAiLookShare } from "../../api/ai";
import {
  composeInstagramStoryImage,
  downloadDataUrl,
  downloadLookImage,
} from "../../lib/compose-instagram-story";
import { INSTAGRAM_CTA, pickInstagramHeadline } from "../../lib/morph-share-copy";
import { openTelegramShare, WEB_ORIGIN } from "../../lib/morph-share";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

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

async function openInstagramAppOrWeb() {
  try {
    const app = "instagram://app";
    const can = await Linking.canOpenURL(app);
    if (can) {
      await Linking.openURL(app);
      return;
    }
  } catch {
    /* web / ruxsat yo‘q */
  }
  await Linking.openURL("https://www.instagram.com/");
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
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const sheetH = Math.round(winH * 0.52);
  const progress = useSharedValue(0);
  const [busy, setBusy] = useState<Network | "copy" | "download" | null>(null);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  const enterMs = reduceMotion ? 1 : 320;
  const exitMs = reduceMotion ? 1 : 240;

  useEffect(() => {
    if (!visible) return;
    setCopied(false);
    setBusy(null);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: enterMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [enterMs, progress, visible]);

  const finishClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    progress.value = withTiming(
      0,
      { duration: exitMs, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      },
    );
  }, [exitMs, finishClose, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [sheetH + 48, 0]),
      },
    ],
  }));

  const ensureLink = useCallback(async () => {
    if (link) return link;
    const next = await resolveShareUrl(styleId, title, previewImage);
    setLink(next);
    return next;
  }, [link, previewImage, styleId, title]);

  const onDownload = useCallback(async () => {
    setBusy("download");
    try {
      const slug = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "look";
      await downloadLookImage(previewImage, `morf-ai-${slug}.jpg`);
    } catch {
      onError("Rasmni yuklab bo‘lmadi");
    } finally {
      setBusy(null);
    }
  }, [onError, previewImage, title]);

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

        await Clipboard.setStringAsync(url);
        if (typeof document !== "undefined") {
          try {
            const headline = pickInstagramHeadline({ userKey, userName });
            const story = await composeInstagramStoryImage({
              resultImageUrl: previewImage,
              styleTitle: title,
              headline,
              cta: INSTAGRAM_CTA,
            });
            await downloadDataUrl(story, "morf-ai-story.jpg");
            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
              const blob = await (await fetch(story)).blob();
              const file = new File([blob], "morf-ai-story.jpg", { type: "image/jpeg" });
              const can = navigator.canShare?.({ files: [file] }) ?? false;
              if (can) {
                await navigator.share({ files: [file] });
                return;
              }
            }
          } catch {
            /* havola + Instagram ochiladi */
          }
        }
        await openInstagramAppOrWeb();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Ulashib bo‘lmadi");
      } finally {
        setBusy(null);
      }
    },
    [ensureLink, onError, previewImage, title, userKey, userName],
  );

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={requestClose}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetH,
              paddingBottom: Math.max(insets.bottom, 14) + 10,
            },
            sheetStyle,
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.title}>Do‘stlarga ulashish</Text>
            <Pressable style={styles.close} onPress={requestClose} hitSlop={8}>
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

          <Pressable
            style={styles.downloadBtn}
            onPress={() => void onDownload()}
            disabled={busy === "download"}
            accessibilityLabel="Rasmni yuklab olish"
          >
            {busy === "download" ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#0A0A0A" />
            )}
            <Text style={styles.downloadText}>Rasmni yuklab olish</Text>
          </Pressable>

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
        </Animated.View>
      </View>
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
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
  },
  handle: {
    alignSelf: "center",
    width: scale(36),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "#D4D4D4",
    marginBottom: verticalScale(12),
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: fontSize(18), fontWeight: "800", color: "#0A0A0A" },
  close: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3F3",
  },
  hint: { marginTop: verticalScale(8), fontSize: fontSize(13), color: "#737373", fontWeight: "600" },
  row: {
    marginTop: verticalScale(22),
    flexDirection: "row",
    justifyContent: "space-between",
  },
  net: { width: scale(72), alignItems: "center", gap: moderateScale(8) },
  netIcon: {
    width: scale(52),
    height: scale(52),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
  },
  netLabel: { fontSize: fontSize(11), fontWeight: "700", color: "#0A0A0A" },
  downloadBtn: {
    marginTop: verticalScale(18),
    minHeight: verticalScale(46),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
    borderRadius: moderateScale(14),
    backgroundColor: "#F3F3F3",
  },
  downloadText: { fontSize: fontSize(14), fontWeight: "800", color: "#0A0A0A" },
  divider: {
    height: 1,
    backgroundColor: "#EFEFEF",
    marginTop: verticalScale(22),
    marginBottom: verticalScale(16),
  },
  copyLabel: { fontSize: fontSize(14), fontWeight: "800", color: "#0A0A0A", marginBottom: verticalScale(8) },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    backgroundColor: "#F5F5F5",
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(12),
    minHeight: verticalScale(46),
  },
  copyUrl: { flex: 1, fontSize: fontSize(12), color: "#525252" },
});
