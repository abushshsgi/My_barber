import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMorphStudioCatalog,
  generateMorphStudioEdit,
  type MorphStudioCategory,
} from "../../api/ai";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { pickSelfieFromGallery } from "../../lib/selfie";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphStudio">;

export function MorphStudioScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const [categories, setCategories] = useState<MorphStudioCategory[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(
    session.tryOnPreview || session.selfieDataUrl,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchMorphStudioCatalog()
      .then((data) => {
        if (!cancelled) setCategories(data.categories ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Katalog yuklanmadi");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureImage = useCallback(async (): Promise<string | null> => {
    if (preview) return preview;
    if (session.tryOnPreview) return session.tryOnPreview;
    if (session.selfieDataUrl) return session.selfieDataUrl;
    const picked = await pickSelfieFromGallery();
    if (picked) {
      setPreview(picked);
      session.setSelfie(picked);
    }
    return picked;
  }, [preview, session]);

  const applyPreset = useCallback(
    async (presetId: string) => {
      const ok = await gate.ensureStudio();
      if (!ok) {
        navigation.navigate("MorphPaywall");
        return;
      }
      const image = await ensureImage();
      if (!image) return;
      setBusyId(presetId);
      setError(null);
      try {
        const out = await generateMorphStudioEdit(image, presetId, {
          styleId: session.tryOnStyleId ?? undefined,
          styleTitle: session.tryOnTitle ?? undefined,
        });
        setPreview(out.preview_image);
        session.setTryOn(out.preview_image, out.style_id, out.style_title || out.preset_label);
        gate.refresh();
      } catch (err) {
        if (gate.handleError(err)) {
          navigation.navigate("MorphPaywall");
          return;
        }
        setError(err instanceof Error ? err.message : "Studio xatosi");
      } finally {
        setBusyId(null);
      }
    },
    [ensureImage, gate, navigation, session],
  );

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <NativeHeader title="Studio" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.previewWrap}>
          {preview ? (
            <Image source={{ uri: preview }} style={styles.preview} />
          ) : (
            <Pressable
              style={[styles.preview, styles.previewEmpty]}
              onPress={() => void ensureImage()}
            >
              <Text style={styles.pickText}>Rasm tanlash</Text>
            </Pressable>
          )}
          {busyId ? (
            <View style={styles.overlay}>
              <ActivityIndicator color="#FFF" size="large" />
              <Text style={styles.overlayText}>Tahrirlanmoqda…</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.limitHint}>
          Studio: {gate.studioRemaining}/{gate.studioLimit}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loadingCatalog ? (
          <ActivityIndicator color={colors.fg} style={{ marginTop: 24 }} />
        ) : (
          categories.map((cat) => (
            <View key={cat.id} style={styles.cat}>
              <Text style={styles.catTitle}>{cat.label_uz}</Text>
              <View style={styles.options}>
                {cat.options.map((opt) => {
                  const busy = busyId === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.opt, busy && styles.optBusy]}
                      disabled={!!busyId}
                      onPress={() => void applyPreset(opt.id)}
                    >
                      {opt.swatch ? (
                        <View style={[styles.swatch, { backgroundColor: opt.swatch }]} />
                      ) : null}
                      <Text style={styles.optText}>{opt.label_uz}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  previewWrap: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.surface,
    aspectRatio: 3 / 4,
  },
  preview: { width: "100%", height: "100%" },
  previewEmpty: { alignItems: "center", justifyContent: "center" },
  pickText: { fontWeight: "700", color: colors.muted },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  overlayText: { color: "#FFF", fontWeight: "700" },
  limitHint: { color: colors.muted, fontWeight: "600", fontSize: 12 },
  error: { color: "#DC2626", fontSize: 13 },
  cat: { gap: 8 },
  catTitle: { fontWeight: "800", fontSize: 15, color: colors.fg },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  optBusy: { opacity: 0.5 },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  optText: { fontWeight: "700", fontSize: 13, color: colors.fg },
});
