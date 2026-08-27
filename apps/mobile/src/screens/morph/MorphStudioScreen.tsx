import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  formatMorphUserError,
  generateMorphStudioEdit,
  saveMorphAiGeneration,
  type MorphStudioCategory,
} from "../../api/ai";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { presentMorphPaywall } from "../../lib/morph-return";
import { pickSelfieFromCamera, pickSelfieFromGallery } from "../../lib/selfie";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type StudioNav = {
  navigate: (
    name: "MorphPaywall",
    params?: MorphStackParamList["MorphPaywall"],
  ) => void;
  goBack: () => void;
};

type Props = {
  navigation: StudioNav;
};

const FALLBACK_CATEGORIES: MorphStudioCategory[] = [
  {
    id: "hair_color",
    label_uz: "Rang",
    label_en: "Color",
    options: [
      { id: "hair_blonde", label_uz: "Sariq", label_en: "Blonde", swatch: "#E8D5A3" },
      { id: "hair_brunette", label_uz: "Jigarrang", label_en: "Brunette", swatch: "#4A2F1F" },
      { id: "hair_black", label_uz: "Qora", label_en: "Black", swatch: "#111111" },
      { id: "hair_auburn", label_uz: "Mis", label_en: "Copper", swatch: "#A0522D" },
      { id: "hair_ash", label_uz: "Kulrang", label_en: "Ash", swatch: "#8B8680" },
      { id: "hair_platinum", label_uz: "Platina", label_en: "Platinum", swatch: "#F2EDE4" },
    ],
  },
  {
    id: "beard",
    label_uz: "Soqol",
    label_en: "Beard",
    options: [
      { id: "beard_clean", label_uz: "Toza", label_en: "Clean" },
      { id: "beard_stubble", label_uz: "Qisqa", label_en: "Stubble" },
      { id: "beard_full", label_uz: "To'liq", label_en: "Full" },
      { id: "beard_shape", label_uz: "Shakl", label_en: "Shaped" },
    ],
  },
  {
    id: "finish",
    label_uz: "Finish",
    label_en: "Finish",
    options: [
      { id: "finish_wet", label_uz: "Nam", label_en: "Wet" },
      { id: "finish_matte", label_uz: "Matte", label_en: "Matte" },
      { id: "finish_gloss", label_uz: "Yaltiroq", label_en: "Gloss" },
      { id: "finish_volume", label_uz: "Hajm", label_en: "Volume" },
    ],
  },
];

export function MorphStudioScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const [categories, setCategories] = useState<MorphStudioCategory[]>(FALLBACK_CATEGORIES);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("hair_color");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [baseImage, setBaseImage] = useState<string | null>(
    session.tryOnPreview || session.selfieDataUrl,
  );
  const [current, setCurrent] = useState<string | null>(
    session.tryOnPreview || session.selfieDataUrl,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchMorphStudioCatalog()
      .then((data) => {
        if (cancelled) return;
        if (data.categories?.length) {
          setCategories(data.categories);
          setActiveCategory(data.categories[0]?.id ?? "hair_color");
        }
      })
      .catch(() => {
        /* fallback categories */
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentCat = useMemo(
    () => categories.find((c) => c.id === activeCategory) ?? categories[0],
    [categories, activeCategory],
  );

  const allPresets = useMemo(
    () => categories.flatMap((c) => c.options.map((o) => ({ ...o, categoryId: c.id }))),
    [categories],
  );

  const ensureImage = useCallback(async (): Promise<string | null> => {
    if (current) return current;
    if (session.tryOnPreview) return session.tryOnPreview;
    if (session.selfieDataUrl) return session.selfieDataUrl;
    const picked = await pickSelfieFromGallery();
    if (picked) {
      setBaseImage(picked);
      setCurrent(picked);
      setHistory([picked]);
      session.setSelfie(picked);
    }
    return picked;
  }, [current, session]);

  const selectImage = useCallback(
    (uri: string) => {
      setBaseImage(uri);
      setCurrent(uri);
      setHistory([uri]);
      setActivePresetId(null);
      setComparing(false);
      session.setSelfie(uri);
    },
    [session],
  );

  const applyPreset = useCallback(
    async (presetId: string) => {
      const result = await gate.ensureStudioDetailed();
      if (!result.ok) {
        presentMorphPaywall(
          navigation,
          result.reason === "limit" ? "limit" : "studio",
          "MorphStudio",
        );
        return;
      }
      const image = await ensureImage();
      if (!image) return;
      const preset = allPresets.find((p) => p.id === presetId);
      if (preset?.categoryId) setActiveCategory(preset.categoryId);
      setBusyId(presetId);
      setActivePresetId(presetId);
      setError(null);
      setComparing(false);
      try {
        const out = await generateMorphStudioEdit(image, presetId, {
          styleId: session.tryOnStyleId ?? undefined,
          styleTitle: session.tryOnTitle ?? undefined,
        });
        setHistory((prev) =>
          prev.length ? [...prev, out.preview_image] : [image, out.preview_image],
        );
        setCurrent(out.preview_image);
        if (!baseImage) setBaseImage(image);
        session.setTryOn(
          out.preview_image,
          out.style_id,
          out.style_title || out.preset_label,
        );
        void saveMorphAiGeneration({
          style_id: session.tryOnStyleId || out.style_id || out.preset_id,
          title: session.tryOnTitle
            ? `${session.tryOnTitle} · ${out.preset_label}`
            : `Studio · ${out.preset_label}`,
          before_image: baseImage || image,
          after_image: out.preview_image,
        }).catch(() => undefined);
        gate.refresh();
      } catch (err) {
        if (gate.handleError(err)) {
          presentMorphPaywall(navigation, "limit", "MorphStudio");
          return;
        }
        setError(formatMorphUserError(err instanceof Error ? err.message : "", "Studio xatosi"));
      } finally {
        setBusyId(null);
      }
    },
    [allPresets, baseImage, ensureImage, gate, navigation, session],
  );

  const undo = useCallback(() => {
    if (history.length <= 1) return;
    const next = history.slice(0, -1);
    setHistory(next);
    setCurrent(next[next.length - 1] ?? baseImage);
    if (next.length <= 1) setActivePresetId(null);
    setComparing(false);
  }, [baseImage, history]);

  const reset = useCallback(() => {
    if (!baseImage) return;
    setCurrent(baseImage);
    setHistory([baseImage]);
    setActivePresetId(null);
    setComparing(false);
  }, [baseImage]);

  const surprise = useCallback(() => {
    if (!allPresets.length || busyId) return;
    const pool = allPresets.filter((p) => p.id !== activePresetId);
    const pick = (pool.length ? pool : allPresets)[
      Math.floor(Math.random() * (pool.length ? pool.length : allPresets.length))
    ];
    if (pick) void applyPreset(pick.id);
  }, [activePresetId, allPresets, applyPreset, busyId]);

  const displaySrc = comparing && baseImage ? baseImage : current;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            const routes = navigation.getState?.()?.routes;
            if (routes && routes.length > 1) {
              navigation.goBack();
            } else {
              navigation.navigate("MorphCapture");
            }
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Ionicons name="sparkles" size={14} color="#FFF" />
          <Text style={styles.topTitle}>AI Studio</Text>
        </View>
        <View style={styles.limitPill}>
          <Text style={styles.limitPillText}>
            {gate.studioRemaining}/{gate.studioLimit}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewWrap}>
          {displaySrc ? (
            <Image source={{ uri: displaySrc }} style={styles.preview} />
          ) : (
            <Pressable
              style={[styles.preview, styles.previewEmpty]}
              onPress={() => void ensureImage()}
            >
              <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.4)" />
              <Text style={styles.pickText}>Rasm tanlash</Text>
            </Pressable>
          )}
          {busyId ? (
            <View style={styles.overlay}>
              <ActivityIndicator color="#FFF" size="large" />
              <Text style={styles.overlayText}>Tahrirlanmoqda…</Text>
            </View>
          ) : null}
          {comparing ? (
            <View style={styles.compareBadge}>
              <Text style={styles.compareBadgeText}>Oldin</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.toolbar}>
          <ToolChip
            icon="camera-outline"
            label="Kamera"
            onPress={() =>
              void pickSelfieFromCamera().then((uri) => {
                if (uri) selectImage(uri);
              })
            }
          />
          <ToolChip
            icon="images-outline"
            label="Galereya"
            onPress={() =>
              void pickSelfieFromGallery().then((uri) => {
                if (uri) selectImage(uri);
              })
            }
          />
          <ToolChip
            icon="shuffle-outline"
            label="Surprise"
            onPress={surprise}
            disabled={!!busyId || !current}
          />
          <ToolChip
            icon="arrow-undo-outline"
            label="Ortga"
            onPress={undo}
            disabled={history.length <= 1 || !!busyId}
          />
          <ToolChip
            icon="refresh-outline"
            label="Reset"
            onPress={reset}
            disabled={!baseImage || !!busyId}
          />
          <ToolChip
            icon="eye-outline"
            label="Taqqos"
            onPressIn={() => baseImage && current !== baseImage && setComparing(true)}
            onPressOut={() => setComparing(false)}
            disabled={!baseImage || current === baseImage}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loadingCatalog ? (
          <ActivityIndicator color="#FFF" style={{ marginTop: 20 }} />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
            >
              {categories.map((cat) => {
                const on = cat.id === currentCat?.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[styles.catChip, on && styles.catChipOn]}
                    onPress={() => setActiveCategory(cat.id)}
                  >
                    <Text style={[styles.catChipText, on && styles.catChipTextOn]}>
                      {cat.label_uz}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.options}>
              {(currentCat?.options ?? []).map((opt) => {
                const busy = busyId === opt.id;
                const active = activePresetId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[
                      styles.opt,
                      active && styles.optActive,
                      busy && styles.optBusy,
                    ]}
                    disabled={!!busyId}
                    onPress={() => void applyPreset(opt.id)}
                  >
                    {opt.swatch ? (
                      <View style={[styles.swatch, { backgroundColor: opt.swatch }]} />
                    ) : (
                      <View style={styles.swatchPlaceholder}>
                        <Ionicons name="sparkles" size={12} color="#FFF" />
                      </View>
                    )}
                    <Text style={styles.optText}>{opt.label_uz}</Text>
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ToolChip({
  icon,
  label,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.toolChip, disabled && styles.toolChipDisabled]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Ionicons name={icon} size={14} color="#FFF" />
      <Text style={styles.toolChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topTitle: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  limitPill: {
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  limitPillText: { fontWeight: "800", fontSize: 11, color: "#050505" },
  body: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  previewWrap: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#141414",
    aspectRatio: 3 / 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  preview: { width: "100%", height: "100%" },
  previewEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pickText: { fontWeight: "700", color: "rgba(255,255,255,0.45)" },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  overlayText: { color: "#FFF", fontWeight: "700" },
  compareBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  compareBadgeText: { color: "#FFF", fontWeight: "700", fontSize: 11 },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  toolChipDisabled: { opacity: 0.35 },
  toolChipText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "700",
  },
  error: { color: "#FCA5A5", fontSize: 13 },
  catRow: { gap: 8, paddingVertical: 2 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  catChipOn: { backgroundColor: "#FFF" },
  catChipText: { color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 13 },
  catChipTextOn: { color: "#050505" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optActive: { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.12)" },
  optBusy: { opacity: 0.55 },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  swatchPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  optText: { fontWeight: "700", fontSize: 13, color: "#FFF" },
});
