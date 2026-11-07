import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  formatMorphUserError,
  generateAiStyleTryOn,
  saveMorphAiGeneration,
} from "../../api/ai";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { presentMorphPaywall } from "../../lib/morph-return";
import { useMorphSession } from "../../lib/morph-session";
import { shareMorphLook } from "../../lib/morph-share";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { useShellNavigation } from "../../lib/shell-nav";
import { useShellTheme } from "../../lib/useShellTheme";
import type { MorphPendingTryOn, MorphStackParamList } from "../../navigation/MorphStack";
import { useTranslation } from "react-i18next";
import { fontSize, moderateScale, scale, verticalScale } from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphPreview">;

/**
 * Chatbot namunasi yoki try-on natijasi.
 * Chatdan ochilganda orqaga chatbotga qaytadi.
 */
export function MorphPreviewScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const pal = useShellTheme();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const { goMorph } = useShellNavigation();
  const {
    styleId,
    title,
    match,
    imageUrl,
    previewImage: initialPreview,
    reason,
    returnTo,
    autoTryOn,
  } = route.params;

  const fromChat = returnTo === "chat";
  const leaving = useRef(false);
  const openingCapture = useRef(false);
  const autoKey = useRef<string | null>(null);

  const [preview, setPreview] = useState<string | null>(
    autoTryOn ? null : initialPreview || session.tryOnByStyle[styleId] || null,
  );
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);

  const imageSrc = preview || imageUrl || null;
  const showMatch = Number.isFinite(match) && match > 0;

  const pendingTryOn = useCallback((): MorphPendingTryOn => {
    return {
      styleId,
      title,
      match,
      imageUrl,
      reason,
      returnTo,
    };
  }, [styleId, title, match, imageUrl, reason, returnTo]);

  const leaveToChat = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    goMorph(navigation, "MorphChat");
    requestAnimationFrame(() => {
      navigation.reset({ index: 0, routes: [{ name: "MorphCapture" }] });
    });
  }, [goMorph, navigation]);

  const onBack = useCallback(() => {
    if (fromChat) {
      leaveToChat();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("MorphCapture");
  }, [fromChat, leaveToChat, navigation]);

  useEffect(() => {
    if (!fromChat) return undefined;
    navigation.setOptions({ gestureEnabled: false });
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (leaving.current || openingCapture.current) return;
      const type = e.data.action.type;
      if (type === "NAVIGATE" || type === "RESET" || type === "REPLACE") return;
      e.preventDefault();
      leaveToChat();
    });
    return () => sub();
  }, [fromChat, leaveToChat, navigation]);

  useFocusEffect(
    useCallback(() => {
      openingCapture.current = false;
      if (!fromChat) return undefined;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        leaveToChat();
        return true;
      });
      return () => sub.remove();
    }, [fromChat, leaveToChat]),
  );

  const openCapture = useCallback(() => {
    openingCapture.current = true;
    session.setPreferredStyle(styleId, title);
    navigation.navigate("MorphCapture", { pendingTryOn: pendingTryOn() });
  }, [navigation, pendingTryOn, session, styleId, title]);

  const runTryOn = useCallback(
    async (opts?: { force?: boolean }) => {
      const photo = session.selfieDataUrl;
      if (!photo) {
        openCapture();
        return;
      }
      if (preview && !opts?.force) return;

      const result = await gate.ensureTryOnDetailed();
      if (!result.ok) {
        presentMorphPaywall(
          navigation,
          result.reason === "limit" ? "limit" : "subscription",
          "MorphPreview",
        );
        return;
      }

      if (opts?.force) setPreview(null);
      setBusy(true);
      try {
        const out = await generateAiStyleTryOn(photo, styleId);
        const nextPreview = out.preview_image;
        const nextId = out.style_id || styleId;
        const nextTitle = out.style_title || title;
        setPreview(nextPreview);
        session.setTryOn(nextPreview, nextId, nextTitle);
        session.setPreferredStyle(nextId, nextTitle);
        void saveMorphAiGeneration({
          style_id: nextId,
          title: nextTitle,
          before_image: photo,
          after_image: nextPreview,
        }).catch(() => undefined);
        gate.refresh();
      } catch (err) {
        if (gate.handleError(err)) {
          presentMorphPaywall(navigation, "limit", "MorphPreview");
          return;
        }
        Alert.alert(
          t("common.error"),
          formatMorphUserError(
            err instanceof Error ? err.message : t("morph.preview.error"),
            t("morph.preview.error"),
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [session, preview, gate, navigation, openCapture, styleId, title, t],
  );

  useEffect(() => {
    if (!autoTryOn || !session.selfieDataUrl) return;
    const key = `${styleId}:${session.selfieDataUrl.length}:${session.selfieDataUrl.slice(-32)}`;
    if (autoKey.current === key) return;
    autoKey.current = key;
    void runTryOn({ force: true });
  }, [autoTryOn, session.selfieDataUrl, styleId, runTryOn]);

  const shareLook = useCallback(async () => {
    setSharing(true);
    try {
      await shareMorphLook({
        styleId,
        title,
        previewImage: preview,
        caption: t("morph.shareCaption", { title }),
      });
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : t("morph.preview.error"),
      );
    } finally {
      setSharing(false);
    }
  }, [styleId, title, preview, t]);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <StatusBar style={pal.status} />

      <View style={[styles.topBar, { paddingTop: safeTop(insets.top, 8) }]}>
        <NativeBackButton onPress={onBack} accessibilityLabel={t("common.back")} />
        <Text style={[styles.topKicker, { color: pal.muted }, pal.font]} numberOfLines={1}>
          {preview ? t("morph.preview.yourLook") : t("morph.preview.style")}
        </Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={[styles.poster, { backgroundColor: pal.iconTile }]}>
        {imageSrc ? (
          <Image
            source={{ uri: imageSrc }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="top"
            transition={180}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: pal.muted }, pal.font]}>
              {t("morph.noImage")}
            </Text>
          </View>
        )}

        <View style={styles.posterBadge}>
          <Text style={[styles.posterBadgeText, pal.font]}>
            {preview ? t("morph.preview.mine") : t("morph.preview.sample")}
          </Text>
        </View>

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color="#FFF" size="large" />
            <Text style={[styles.busyText, pal.font]}>{t("morph.generating")}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ paddingBottom: safeBottom(insets.bottom, 12), paddingTop: verticalScale(16) }}>
        <Text style={[styles.title, { color: pal.fg }, pal.font]} numberOfLines={2}>
          {title}
        </Text>
        {reason ? (
          <Text style={[styles.reason, { color: pal.muted }, pal.font]} numberOfLines={3}>
            {reason}
          </Text>
        ) : null}
        {showMatch ? (
          <View style={[styles.matchPill, { backgroundColor: pal.iconTile }]}>
            <Text style={[styles.matchText, { color: pal.fg }, pal.font]}>
              {t("morph.preview.match", { value: Math.round(match) })}
            </Text>
          </View>
        ) : null}

        {preview ? (
          <View style={styles.actions}>
            <Pressable
              style={[styles.primary, { backgroundColor: pal.accent }, sharing && styles.disabled]}
              disabled={sharing || busy}
              onPress={() => void shareLook()}
            >
              {sharing ? (
                <ActivityIndicator color={pal.onAccent} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color={pal.onAccent} />
                  <Text style={[styles.primaryText, { color: pal.onAccent }, pal.font]}>
                    {t("morph.preview.share")}
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.textBtn} disabled={busy} onPress={openCapture}>
              <Text style={[styles.textBtnLabel, { color: pal.muted }, pal.font]}>
                {t("morph.preview.newPhoto")}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              style={[styles.primary, { backgroundColor: pal.accent }, busy && styles.disabled]}
              disabled={busy}
              onPress={() => void runTryOn()}
            >
              {busy ? (
                <ActivityIndicator color={pal.onAccent} />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color={pal.onAccent} />
                  <Text style={[styles.primaryText, { color: pal.onAccent }, pal.font]}>
                    {t("morph.preview.tryOn")}
                  </Text>
                </>
              )}
            </Pressable>
            <Text style={[styles.hint, { color: pal.muted }, pal.font]}>{t("morph.preview.hint")}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(10),
    gap: moderateScale(12),
  },
  topKicker: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize(13),
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  topSpacer: { width: scale(38) },
  poster: {
    flex: 1,
    marginHorizontal: scale(16),
    borderRadius: moderateScale(28),
    overflow: "hidden",
    minHeight: verticalScale(240),
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: fontSize(14), fontWeight: "600" },
  posterBadge: {
    position: "absolute",
    left: scale(14),
    bottom: verticalScale(14),
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
  },
  posterBadgeText: {
    color: "#FFF",
    fontSize: fontSize(12),
    fontWeight: "700",
  },
  busy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
  },
  busyText: { color: "#FFF", fontWeight: "700", fontSize: fontSize(14) },
  title: {
    paddingHorizontal: scale(22),
    fontSize: fontSize(28),
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  reason: {
    paddingHorizontal: scale(22),
    marginTop: verticalScale(6),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
  },
  matchPill: {
    alignSelf: "flex-start",
    marginLeft: scale(22),
    marginTop: verticalScale(10),
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  matchText: { fontSize: fontSize(12), fontWeight: "700" },
  actions: {
    paddingHorizontal: scale(16),
    marginTop: verticalScale(16),
    gap: moderateScale(8),
  },
  primary: {
    minHeight: verticalScale(54),
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  primaryText: { fontSize: fontSize(16), fontWeight: "700" },
  disabled: { opacity: 0.6 },
  hint: {
    textAlign: "center",
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    paddingHorizontal: scale(12),
  },
  textBtn: {
    minHeight: verticalScale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  textBtnLabel: { fontSize: fontSize(14), fontWeight: "700" },
});
