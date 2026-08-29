import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  generateAiStyleTryOn,
  saveMorphAiGeneration,
} from "../../api/ai";
import {
  openTelegramShare,
  shareMorphLook,
  WEB_ORIGIN,
} from "../../lib/morph-share";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { presentMorphPaywall } from "../../lib/morph-return";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphPreview">;

/**
 * Web `AiStylePreviewSheet` — generatsiya qilingan rasm ustiga bosilganda.
 */
export function MorphPreviewScreen({ navigation, route }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const {
    styleId,
    title,
    match,
    imageUrl,
    previewImage: initialPreview,
    salonId,
  } = route.params;

  const [preview, setPreview] = useState<string | null>(
    initialPreview || session.tryOnByStyle[styleId] || null,
  );
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState(false);

  const imageSrc = preview || imageUrl || session.selfieDataUrl;

  const runTryOn = useCallback(async () => {
    if (!session.selfieDataUrl) {
      Alert.alert("Selfie kerak", "Avval yuzingizni skanerlang.");
      return;
    }
    if (preview) return;
    const result = await gate.ensureTryOnDetailed();
    if (!result.ok) {
      presentMorphPaywall(
        navigation,
        result.reason === "limit" ? "limit" : "subscription",
        "MorphPreview",
      );
      return;
    }
    setBusy(true);
    try {
      const out = await generateAiStyleTryOn(session.selfieDataUrl, styleId);
      setPreview(out.preview_image);
      session.setTryOn(out.preview_image, out.style_id || styleId, out.style_title || title);
      void saveMorphAiGeneration({
        style_id: out.style_id || styleId,
        title: out.style_title || title,
        before_image: session.selfieDataUrl,
        after_image: out.preview_image,
      }).catch(() => undefined);
      gate.refresh();
    } catch (err) {
      if (gate.handleError(err)) {
        presentMorphPaywall(navigation, "limit", "MorphPreview");
        return;
      }
      Alert.alert("Xato", err instanceof Error ? err.message : "Try-on xatosi");
    } finally {
      setBusy(false);
    }
  }, [session, gate, navigation, preview, styleId, title]);

  const resolveShareUrl = useCallback(async () => {
    await shareMorphLook({
      styleId,
      title,
      previewImage: preview,
    });
  }, [styleId, title, preview]);

  const shareTelegram = useCallback(async () => {
    setSharing(true);
    try {
      let pageUrl = `${WEB_ORIGIN}/morf-ai/look/${encodeURIComponent(styleId)}`;
      const text = `${title} — Morf AI da sinab ko‘ring`;
      if (preview) {
        try {
          const { createMorphAiLookShare } = await import("../../api/ai");
          const created = await createMorphAiLookShare({
            style_id: styleId,
            title,
            after_image: preview,
          });
          pageUrl =
            created.share_page_url ||
            `${WEB_ORIGIN}/morf-ai/share/${encodeURIComponent(created.id)}`;
        } catch {
          /* fallback */
        }
      }
      await openTelegramShare(pageUrl, text);
    } catch (err) {
      Alert.alert("Ulashish", err instanceof Error ? err.message : "Xatolik");
    } finally {
      setSharing(false);
    }
  }, [styleId, title, preview]);

  const openMap = useCallback(() => {
    void Linking.openURL(`${WEB_ORIGIN}/map`);
  }, []);

  const openBooking = useCallback(() => {
    if (salonId) {
      void Linking.openURL(`${WEB_ORIGIN}/booking/${salonId}`);
      return;
    }
    void Linking.openURL(`${WEB_ORIGIN}/map`);
  }, [salonId]);

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <ScrollView
        style={{ flex: 1 }}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={styles.hero}>
          {imageSrc ? (
            <Image source={{ uri: imageSrc }} style={styles.heroImg} />
          ) : (
            <View style={[styles.heroImg, styles.heroEmpty]}>
              <Text style={styles.heroEmptyText}>Rasm yo‘q</Text>
            </View>
          )}

          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color="#FFF" size="large" />
              <Text style={styles.busyText}>AI yaratmoqda...</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.backBtn, { top: Math.max(insets.top, 12) }]}
            onPress={() => {
              const routes = navigation.getState?.()?.routes;
              if (routes && routes.length > 1) {
                navigation.goBack();
              } else {
                navigation.navigate("MorphCapture");
              }
            }}
          >
            <Ionicons name="chevron-back" size={18} color="#FFF" />
            <Text style={styles.backText}>Orqaga</Text>
          </Pressable>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.85)"]}
            style={styles.heroGrad}
          >
            <Text style={styles.badge}>{preview ? "SIZNING PREVIEW" : "USLUB"}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.match}>{Math.round(match)}% mos</Text>
          </LinearGradient>
        </View>

        <View style={styles.body}>
          {preview ? (
            <View style={styles.card}>
              <View style={styles.shareHead}>
                <View style={styles.shareIcon}>
                  <Ionicons name="paper-plane" size={16} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Do'stlarga ulashing</Text>
                  <Text style={styles.cardSub}>
                    Telegram yoki Instagram Story orqali yuboring — do'stlaringiz ham o'zida
                    sinab ko'radi.
                  </Text>
                </View>
              </View>
              <View style={styles.shareRow}>
                <Pressable
                  style={[styles.tgBtn, sharing && styles.btnDisabled]}
                  disabled={sharing}
                  onPress={() => void shareTelegram()}
                >
                  {sharing ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={16} color="#FFF" />
                      <Text style={styles.shareBtnText}>Telegram</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.igBtn, sharing && styles.btnDisabled]}
                  disabled={sharing}
                  onPress={() => void resolveShareUrl()}
                >
                  <Ionicons name="logo-instagram" size={16} color="#FFF" />
                  <Text style={styles.shareBtnText}>Instagram</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {preview ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Yaqin salonlarda kesib oling</Text>
              <Text style={styles.cardSub}>
                Yaqin salonlarni ko'rish uchun xaritani oching
              </Text>
              <Pressable style={styles.mapLink} onPress={openMap}>
                <Ionicons name="location-outline" size={16} color="#0A0A0A" />
                <Text style={styles.mapLinkText}>Xaritani ochish</Text>
              </Pressable>
            </View>
          ) : null}

          {preview ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("MorphStudio")}
            >
              <Ionicons name="color-palette-outline" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>AI Studio</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              Alert.alert(
                "AI Barber Consult",
                "Tez orada mobil ilovada ochiladi. Hozir web versiyadan foydalaning.",
              )
            }
          >
            <Ionicons name="sparkles-outline" size={18} color="#0A0A0A" />
            <Text style={styles.secondaryBtnText}>AI Barber Consult</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              const routes = navigation.getState?.()?.routes;
              if (routes && routes.length > 1) {
                navigation.goBack();
              } else {
                navigation.navigate("MorphCapture");
              }
            }}
          >
            <Ionicons name="chevron-back" size={18} color="#0A0A0A" />
            <Text style={styles.secondaryBtnText}>Natijalarga qaytish</Text>
          </Pressable>

          <View style={styles.utilRow}>
            <UtilBtn
              icon="download-outline"
              label="Yuklab olish"
              onPress={() => void resolveShareUrl()}
            />
            <UtilBtn
              icon="share-outline"
              label="Ulashish"
              onPress={() => void resolveShareUrl()}
            />
            <UtilBtn
              icon={saved ? "bookmark" : "bookmark-outline"}
              label={saved ? "Saqlangan" : "Saqlash"}
              active={saved}
              onPress={() => setSaved((v) => !v)}
            />
            <UtilBtn
              icon="grid-outline"
              label="Boshqa uslublar"
              onPress={() => {
                const routes = navigation.getState?.()?.routes;
                if (routes && routes.length > 1) {
                  navigation.goBack();
                } else {
                  navigation.navigate("MorphCapture");
                }
              }}
            />
          </View>

          {!preview ? (
            <Pressable
              style={styles.primaryBtn}
              disabled={busy}
              onPress={() => void runTryOn()}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Mening suratimda</Text>
                </>
              )}
            </Pressable>
          ) : null}

          <Pressable style={styles.primaryBtn} onPress={openBooking}>
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Bron qilish</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              void Linking.openURL(`${WEB_ORIGIN}/explore/${encodeURIComponent(styleId)}`)
            }
          >
            <Text style={styles.stylePage}>Uslub sahifasi</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function UtilBtn({
  icon,
  label,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      style={[styles.utilBtn, active && styles.utilBtnOn]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={active ? "#FFF" : "#0A0A0A"} />
      <Text style={[styles.utilLabel, active && styles.utilLabelOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF" },
  hero: {
    minHeight: 420,
    backgroundColor: "#111",
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: 460 },
  heroEmpty: { alignItems: "center", justifyContent: "center" },
  heroEmptyText: { color: "#A3A3A3" },
  busy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  busyText: { color: "#FFF", fontWeight: "700" },
  backBtn: {
    position: "absolute",
    left: 14,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backText: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  heroGrad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 80,
  },
  badge: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: { color: "#FFF", fontSize: 26, fontWeight: "800", marginTop: 4 },
  match: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4, fontWeight: "600" },
  body: { paddingHorizontal: 18, paddingTop: 16, gap: 12 },
  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  shareHead: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  shareIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0A0A0A" },
  cardSub: { fontSize: 12, lineHeight: 17, color: "#737373", marginTop: 2 },
  shareRow: { flexDirection: "row", gap: 10 },
  tgBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#2AABEE",
  },
  igBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#C13584",
  },
  shareBtnText: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  btnDisabled: { opacity: 0.6 },
  mapLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  mapLinkText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0A0A0A",
    textDecorationLine: "underline",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#111111",
  },
  primaryBtnText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  secondaryBtnText: { color: "#0A0A0A", fontWeight: "800", fontSize: 14 },
  utilRow: { flexDirection: "row", gap: 8 },
  utilBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
  },
  utilBtnOn: { backgroundColor: "#111111" },
  utilLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0A0A0A",
    textAlign: "center",
    includeFontPadding: false,
  },
  utilLabelOn: { color: "#FFF" },
  stylePage: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#737373",
    textDecorationLine: "underline",
    marginTop: 4,
  },
});
