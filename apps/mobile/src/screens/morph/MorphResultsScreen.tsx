import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  analyzeAiStyle,
  checkAiStyleFace,
  generateAiStyleTryOn,
  saveAiStyleHistory,
  type AiStyleSuggestion,
} from "../../api/ai";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { useMorphSession } from "../../morph/MorphSessionContext";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import { scaleFont } from "../../theme/layout";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphResults">;

type Phase = "checking" | "analyzing" | "ready" | "tryon" | "error";

export function MorphResultsScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fs = (n: number) => scaleFont(n, width);
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);

  const runAnalyze = useCallback(async () => {
    if (!session.selfieDataUrl) {
      setError("Selfie topilmadi");
      setPhase("error");
      return;
    }
    setPhase("checking");
    setError(null);
    try {
      const face = await checkAiStyleFace(session.selfieDataUrl);
      if (!face.has_face) {
        throw new Error(face.detail || "Yuz topilmadi. Aniqroq selfie yuklang.");
      }
      setPhase("analyzing");
      const result = await analyzeAiStyle(session.selfieDataUrl, "men");
      session.setAnalyze(result);
      void saveAiStyleHistory({
        image: session.selfieDataUrl,
        face_shape_key: result.face_shape,
        hair_type_key: result.hair_type,
        source: "gallery",
        replace_latest: true,
      }).catch(() => undefined);
      setPhase("ready");

      const first = result.suggestions[0];
      if (first) {
        void runTryOn(first);
      }
    } catch (err) {
      if (gate.handleError(err)) {
        navigation.navigate("MorphPaywall");
        return;
      }
      setError(err instanceof Error ? err.message : "Tahlil xatosi");
      setPhase("error");
    }
  }, [session, gate, navigation]);

  const runTryOn = useCallback(
    async (style: AiStyleSuggestion) => {
      if (!session.selfieDataUrl) return;
      const ok = await gate.ensureTryOn();
      if (!ok) {
        navigation.navigate("MorphPaywall");
        return;
      }
      setActiveStyleId(style.id);
      setPhase("tryon");
      try {
        const out = await generateAiStyleTryOn(session.selfieDataUrl, style.id);
        session.setTryOn(out.preview_image, out.style_id, out.style_title || style.title);
        gate.refresh();
        setPhase("ready");
      } catch (err) {
        if (gate.handleError(err)) {
          navigation.navigate("MorphPaywall");
          return;
        }
        setError(err instanceof Error ? err.message : "Try-on xatosi");
        setPhase("ready");
      } finally {
        setActiveStyleId(null);
      }
    },
    [session, gate, navigation],
  );

  useEffect(() => {
    void runAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bir marta selfie bilan
  }, []);

  const suggestions = session.analyze?.suggestions ?? [];
  const preview = session.tryOnPreview || session.selfieDataUrl;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.topBar}>
        <NativeBackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.topTitle, { fontSize: fs(16) }]}>Natija</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewWrap}>
          {preview ? (
            <Image source={{ uri: preview }} style={styles.preview} />
          ) : (
            <View style={[styles.preview, styles.previewEmpty]} />
          )}
          {(phase === "checking" || phase === "analyzing" || phase === "tryon") && (
            <View style={styles.overlay}>
              <ActivityIndicator color="#FFF" size="large" />
              <Text style={styles.overlayText}>
                {phase === "checking"
                  ? "Yuz tekshirilmoqda…"
                  : phase === "analyzing"
                    ? "Uslublar tanlanmoqda…"
                    : "Try-on yaratilmoqda…"}
              </Text>
            </View>
          )}
        </View>

        {session.analyze ? (
          <View style={styles.meta}>
            <Text style={[styles.summary, { fontSize: fs(14) }]}>
              {session.analyze.summary_uz}
            </Text>
            <Text style={styles.chips}>
              {session.analyze.face_shape} · {session.analyze.hair_type}
              {session.tryOnTitle ? ` · ${session.tryOnTitle}` : ""}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => void runAnalyze()}>
              <Text style={styles.retryText}>Qayta urinish</Text>
            </Pressable>
          </View>
        ) : null}

        {suggestions.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: fs(15) }]}>
              Tavsiya etilgan uslublar
            </Text>
            <FlatList
              data={suggestions}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.styleRow}
              renderItem={({ item }) => {
                const on = item.id === session.tryOnStyleId;
                const loading = activeStyleId === item.id;
                return (
                  <Pressable
                    style={[styles.styleCard, on && styles.styleCardOn]}
                    onPress={() => void runTryOn(item)}
                    disabled={phase === "tryon"}
                  >
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.styleImg}
                    />
                    {loading ? (
                      <View style={styles.styleBusy}>
                        <ActivityIndicator color="#FFF" />
                      </View>
                    ) : null}
                    <Text style={styles.styleTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.styleMatch}>{Math.round(item.match)}% mos</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : null}

        {session.tryOnPreview ? (
          <View style={styles.actions}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => navigation.navigate("MorphStudio")}
            >
              <Ionicons name="color-palette-outline" size={18} color="#FFF" />
              <Text style={styles.actionText}>Studio</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnAlt]}
              onPress={() => navigation.navigate("MorphHistory")}
            >
              <Ionicons name="time-outline" size={18} color={colors.fg} />
              <Text style={[styles.actionText, styles.actionTextAlt]}>Tarix</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  topTitle: { color: "#FFF", fontWeight: "800" },
  previewWrap: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
    aspectRatio: 3 / 4,
  },
  preview: { width: "100%", height: "100%" },
  previewEmpty: { backgroundColor: "#1A1A1A" },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  overlayText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  meta: { paddingHorizontal: 16, paddingTop: 14, gap: 6 },
  summary: { color: "rgba(255,255,255,0.85)", lineHeight: 20 },
  chips: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.15)",
    gap: 10,
  },
  errorText: { color: "#FCA5A5", fontSize: 13 },
  retry: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { fontWeight: "800", color: "#0A0A0A", fontSize: 12 },
  section: { marginTop: 18 },
  sectionTitle: {
    color: "#FFF",
    fontWeight: "800",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  styleRow: { paddingHorizontal: 16, gap: 10 },
  styleCard: {
    width: 120,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
    borderWidth: 2,
    borderColor: "transparent",
  },
  styleCardOn: { borderColor: "#FFF" },
  styleImg: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#222" },
  styleBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  styleTitle: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  styleMatch: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#1F1F1F",
  },
  actionBtnAlt: { backgroundColor: "#FFF" },
  actionText: { color: "#FFF", fontWeight: "800" },
  actionTextAlt: { color: "#0A0A0A" },
});
