import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeModal } from "../../ui/SafeModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../../lib/safe-area";
import { captureRef } from "react-native-view-shot";
import { useTranslation } from "react-i18next";
import {
  fetchAiStyleHistory,
  generateCareProgressStory,
  saveAiStyleHistory,
  type CareProgressStoryResult,
} from "../../../api/ai";
import { fetchCareShelf } from "../../../api/care";
import { resolveMediaUrl } from "../../../api/media";
import { useAuth } from "../../../auth/AuthContext";
import { BeforeAfterSlider } from "../BeforeAfterSlider";
import { Skeleton } from "../../ui/Skeleton";
import {
  readCareAlbumMeta,
  saveCareAlbumMeta,
  type CareAlbumMeta,
} from "../../../lib/care-album-meta";
import { downloadLookImage } from "../../../lib/compose-instagram-story";
import { pickSelfieFromGallery } from "../../../lib/selfie";
import type { MyCareProduct } from "../../../lib/morph-my-products";
import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type ProductOption = { id: string; name: string };

type AlbumEntry = {
  id: string;
  imageUrl: string;
  takenAt: Date;
};

type Props = {
  fallbackProducts: MyCareProduct[];
  goalHint: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dayDiff(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY_MS));
}

function formatDate(date: Date, locale: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat(locale, {
    day: style === "long" ? "numeric" : "2-digit",
    month: style === "long" ? "long" : "short",
  }).format(date);
}

export function CareAlbumContent({ fallbackProducts, goalHint }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const storyRef = useRef<View>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<AlbumEntry[]>([]);
  const [albumMeta, setAlbumMeta] = useState<CareAlbumMeta>({});
  const [shelfNames, setShelfNames] = useState<ProductOption[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyData, setStoryData] = useState<CareProgressStoryResult | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const productOptions = useMemo(() => {
    const byName = new Map<string, ProductOption>();
    for (const item of shelfNames) byName.set(item.name.toLowerCase(), item);
    for (const item of fallbackProducts) {
      const name = item.name?.trim();
      if (!name) continue;
      if (!byName.has(name.toLowerCase())) {
        byName.set(name.toLowerCase(), { id: `mine:${item.id}`, name });
      }
    }
    return Array.from(byName.values()).slice(0, 12);
  }, [fallbackProducts, shelfNames]);

  const selectedNames = useMemo(
    () =>
      selectedProductIds
        .map((id) => productOptions.find((row) => row.id === id)?.name || "")
        .filter(Boolean)
        .slice(0, 4),
    [productOptions, selectedProductIds],
  );

  const groupedEntries = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: AlbumEntry[] }> = [];
    for (const entry of entries) {
      const key = entry.takenAt.toISOString().slice(0, 10);
      const label = formatDate(entry.takenAt, i18n.language || "uz", "long");
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(entry);
      else groups.push({ key, label, items: [entry] });
    }
    return groups;
  }, [entries, i18n.language]);

  const journey = useMemo(() => {
    if (entries.length < 2) return null;
    const before = entries[0];
    const after = entries[entries.length - 1];
    const days = dayDiff(before.takenAt, after.takenAt);
    if (days < 7) return null;
    return { before, after, days };
  }, [entries]);

  const durationDays = useMemo(() => {
    if (entries.length < 2) return entries.length > 0 ? 1 : 0;
    return Math.max(1, dayDiff(entries[0].takenAt, entries[entries.length - 1].takenAt));
  }, [entries]);

  const journeyProducts = useMemo(() => {
    if (!journey) return [];
    const start = journey.before.takenAt.getTime();
    const end = journey.after.takenAt.getTime();
    const unique = new Set<string>();
    for (const entry of entries) {
      const ts = entry.takenAt.getTime();
      if (ts < start || ts > end) continue;
      for (const label of albumMeta[entry.id]?.product_names || []) {
        if (label?.trim()) unique.add(label.trim());
      }
    }
    return Array.from(unique).slice(0, 6);
  }, [albumMeta, entries, journey]);

  const loadAlbum = useCallback(async () => {
    const [history, shelf, meta] = await Promise.all([
      fetchAiStyleHistory().catch(() => []),
      fetchCareShelf().catch(() => ({ items: [], summary: { active: 0, refill_soon: 0, expired: 0 } })),
      readCareAlbumMeta(user?.id),
    ]);

    const nextEntries = history
      .filter((row) => Boolean(row.photo_url))
      .map((row) => ({
        id: String(row.id),
        imageUrl: resolveMediaUrl(row.photo_url || "", { width: 900 }) || row.photo_url || "",
        takenAt: new Date(row.scanned_at),
      }))
      .filter((row) => row.imageUrl && !Number.isNaN(row.takenAt.getTime()))
      .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());

    const shelfOpts = (shelf.items || [])
      .map((item) => {
        const name = [item.brand, item.name].filter(Boolean).join(" · ").trim() || item.name;
        if (!name) return null;
        return { id: `shelf:${item.product_id ?? item.id}`, name };
      })
      .filter((row): row is ProductOption => row != null);

    setEntries(nextEntries);
    setShelfNames(shelfOpts);
    setAlbumMeta(meta);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadAlbum().finally(() => setLoading(false));
    }, [loadAlbum]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAlbum();
    } finally {
      setRefreshing(false);
    }
  }, [loadAlbum]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const onAddPhoto = async () => {
    const image = await pickSelfieFromGallery();
    if (!image) return;
    setUploading(true);
    try {
      const saved = await saveAiStyleHistory({ image, source: "gallery" });
      if (!saved?.id) {
        notify(
          t("care.album.upload.failedTitle", { defaultValue: "Saqlanmadi" }),
          t("care.album.upload.persistOff", {
            defaultValue: "Chat sozlamalarida tarix saqlash yoqilgan bo'lishi kerak.",
          }),
        );
        return;
      }
      const nextMeta: CareAlbumMeta = {
        ...albumMeta,
        [String(saved.id)]: {
          product_ids: selectedProductIds.slice(0, 8),
          product_names: selectedNames,
          goal: goalHint,
        },
      };
      setAlbumMeta(nextMeta);
      await saveCareAlbumMeta(user?.id, nextMeta);
      await loadAlbum();
      setAddOpen(false);
      setSelectedProductIds([]);
      notify(
        t("care.album.upload.successTitle", { defaultValue: "Qo'shildi" }),
        t("care.album.upload.success", { defaultValue: "Parvarish albomiga rasm qo'shildi." }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      notify(
        t("care.album.upload.failedTitle", { defaultValue: "Xatolik" }),
        message || t("care.album.upload.failed", { defaultValue: "Rasmni yuklab bo'lmadi." }),
      );
    } finally {
      setUploading(false);
    }
  };

  const runStoryAi = useCallback(async () => {
    if (!journey) return;
    setStoryLoading(true);
    setStoryError(null);
    try {
      const data = await generateCareProgressStory({
        days_count: journey.days,
        products_list: journeyProducts.length ? journeyProducts : selectedNames,
        user_goal: goalHint,
      });
      setStoryData(data);
    } catch (error) {
      setStoryError(
        error instanceof Error
          ? error.message
          : t("care.album.story.aiError", { defaultValue: "AI xulosani tayyorlab bo'lmadi." }),
      );
    } finally {
      setStoryLoading(false);
    }
  }, [goalHint, journey, journeyProducts, selectedNames, t]);

  const openStory = () => {
    if (!journey) return;
    setStoryOpen(true);
    if (!storyData && !storyLoading) void runStoryAi();
  };

  const captureStory = async (): Promise<string> => {
    if (!storyRef.current) throw new Error("Story topilmadi");
    return captureRef(storyRef, {
      format: "png",
      quality: 1,
      result: Platform.OS === "web" ? "data-uri" : "tmpfile",
    });
  };

  const onShareStory = async () => {
    setExporting(true);
    try {
      const uri = await captureStory();
      if (Platform.OS === "web") {
        await downloadLookImage(uri, "mysaloon-care-story.png");
        return;
      }
      await Share.share({ url: uri, message: "MySaloon x Morf AI — Parvarish natijam" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("User did not share")) return;
      notify(
        t("care.album.story.shareErrorTitle", { defaultValue: "Ulashish" }),
        t("care.album.story.shareError", { defaultValue: "Story ulashib bo'lmadi." }),
      );
    } finally {
      setExporting(false);
    }
  };

  const onSaveStory = async () => {
    setExporting(true);
    try {
      const uri = await captureStory();
      if (Platform.OS === "web") {
        await downloadLookImage(uri, "mysaloon-care-story.png");
        return;
      }
      const MediaLibrary = await import("expo-media-library/legacy");
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        notify(
          t("care.album.story.saveErrorTitle", { defaultValue: "Ruxsat kerak" }),
          t("care.album.story.permission", { defaultValue: "Galereyaga saqlash uchun ruxsat bering." }),
        );
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      notify(
        t("care.album.story.savedTitle", { defaultValue: "Saqlandi" }),
        t("care.album.story.saved", { defaultValue: "Story galereyaga saqlandi." }),
      );
    } catch {
      notify(
        t("care.album.story.saveErrorTitle", { defaultValue: "Xatolik" }),
        t("care.album.story.saveError", { defaultValue: "Story saqlanmadi." }),
      );
    } finally {
      setExporting(false);
    }
  };

  const cardW = (width - scale(14) * 2 - scale(8)) / 2;
  const compareW = Math.min(width - scale(28), scale(360));
  const compareH = Math.round(compareW * 1.15);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton height={verticalScale(72)} radius={moderateScale(20)} />
        <View style={styles.loadingGrid}>
          <Skeleton height={verticalScale(160)} radius={moderateScale(18)} />
          <Skeleton height={verticalScale(160)} radius={moderateScale(18)} />
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.pageScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        contentContainerStyle={{ paddingBottom: verticalScale(120) }}
      >
        <Text style={styles.badge}>
          {t("care.album.badge", { defaultValue: "Parvarish Albomi" })}
        </Text>
        <Text style={styles.title}>
          {t("care.album.title", { defaultValue: "Mening Parvarish Albomim" })}
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>
              📸 {t("care.album.metrics.total", { defaultValue: "Jami rasmlar" })}
            </Text>
            <Text style={styles.metricValue}>{entries.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>
              🗓️ {t("care.album.metrics.duration", { defaultValue: "Davomiylik" })}
            </Text>
            <Text style={styles.metricValue}>
              {durationDays > 0
                ? t("care.album.metrics.durationValue", {
                    defaultValue: "{{count}} kundan beri",
                    count: durationDays,
                  })
                : t("care.album.metrics.notStarted", { defaultValue: "Hali boshlanmagan" })}
            </Text>
          </View>
        </View>

        {journey ? (
          <Pressable onPress={openStory} style={styles.resultCard}>
            <LinearGradient
              colors={["#6E56CF", "#7B5FFF", "#3B82F6"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.resultEyebrow}>
              {t("care.album.resultReady", { defaultValue: "Natija tayyor" })}
            </Text>
            <Text style={styles.resultTitle}>
              {journey.days >= 30
                ? t("care.album.monthlyReady", {
                    defaultValue: "1 Oylik AI Before & After Reelingiz!",
                  })
                : t("care.album.weeklyReady", {
                    defaultValue: "7 Kunlik Natijangiz Tayyor!",
                  })}
            </Text>
            <View style={styles.resultCtaRow}>
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              <Text style={styles.resultCta}>
                {t("care.album.viewAndShare", { defaultValue: "Natijani Ko'rish va Ulashish" })}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.helperCard}>
            <Text style={styles.helperText}>
              {t("care.album.helper", {
                defaultValue: "Kamida 2 ta rasm va 7 kunlik farq bo'lsa AI natija ochiladi.",
              })}
            </Text>
          </View>
        )}

        {productOptions.length > 0 ? (
          <View style={styles.productsSection}>
            <Text style={styles.sectionLabel}>
              {t("care.album.productsForToday", { defaultValue: "Bugun ishlatilgan mahsulotlar" })}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {productOptions.map((item) => {
                const active = selectedProductIds.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleProduct(item.id)}
                    style={[styles.chip, active && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextOn]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.gridSection}>
          {groupedEntries.length ? (
            groupedEntries.map((group) => (
              <View key={group.key} style={styles.groupBlock}>
                <Text style={styles.sectionLabel}>{group.label}</Text>
                <View style={styles.grid}>
                  {group.items.map((entry) => (
                    <View key={entry.id} style={[styles.photoCard, { width: cardW }]}>
                      <View style={[styles.photoWrap, { width: cardW, height: cardW * 1.28 }]}>
                        <Image source={{ uri: entry.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <LinearGradient
                          colors={["transparent", "rgba(0,0,0,0.72)"]}
                          style={styles.photoGradient}
                        />
                        <Text style={styles.photoDate}>
                          {formatDate(entry.takenAt, i18n.language || "uz")}
                        </Text>
                      </View>
                      <View style={styles.badgeRow}>
                        {(albumMeta[entry.id]?.product_names || []).slice(0, 2).map((label) => (
                          <View key={`${entry.id}:${label}`} style={styles.productBadge}>
                            <Text style={styles.productBadgeText} numberOfLines={1}>{label}</Text>
                          </View>
                        ))}
                        {!albumMeta[entry.id]?.product_names?.length ? (
                          <Text style={styles.noProducts}>
                            {t("care.album.noProducts", { defaultValue: "Mahsulot belgilanmagan" })}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="images-outline" size={22} color="#11111155" />
              <Text style={styles.emptyTitle}>
                {t("care.album.emptyTitle", { defaultValue: "Parvarish albomingiz hali bo'sh." })}
              </Text>
              <Text style={styles.emptySub}>
                {t("care.album.emptySub", { defaultValue: "Har hafta rasm qo'shib, progressni kuzating." })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + verticalScale(8) }]}
        onPress={() => setAddOpen(true)}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Ionicons name="camera" size={18} color="#FFFFFF" />
        )}
        <Text style={styles.fabText}>
          {t("care.album.addPhoto", { defaultValue: "Yangi rasm qo'shish" })}
        </Text>
      </Pressable>

      <SafeModal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setAddOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: safeBottom(insets.bottom, 0) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {t("care.album.addTitle", { defaultValue: "Progress rasmi" })}
            </Text>
            <Text style={styles.sheetSub}>
              {t("care.album.addSub", {
                defaultValue: "Galereyadan rasm tanlang va ishlatilgan mahsulotlarni belgilang.",
              })}
            </Text>
            {selectedNames.length ? (
              <View style={styles.selectedWrap}>
                {selectedNames.map((name) => (
                  <View key={name} style={styles.selectedChip}>
                    <Text style={styles.selectedChipText}>{name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable style={styles.primaryBtn} onPress={() => void onAddPhoto()} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {t("care.album.pickPhoto", { defaultValue: "Galereyadan tanlash" })}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeModal>

      <SafeModal visible={storyOpen && !!journey} animationType="slide" onRequestClose={() => setStoryOpen(false)}>
        <View style={[styles.storyRoot, { paddingTop: insets.top }]}>
          <View style={styles.storyHeader}>
            <Text style={styles.storyHeaderTitle}>
              {t("care.album.story.modalTitle", { defaultValue: "Before & After Story" })}
            </Text>
            <Pressable onPress={() => setStoryOpen(false)} style={styles.storyClose}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: safeBottom(insets.bottom, 0) + verticalScale(12) }}
          >
            <Text style={styles.interactiveLabel}>
              {t("care.album.story.interactive", { defaultValue: "Siljitib solishtiring" })}
            </Text>
            <View style={styles.compareWrap}>
              <BeforeAfterSlider
                beforeUri={journey?.before.imageUrl || ""}
                afterUri={journey?.after.imageUrl || ""}
                width={compareW}
                height={compareH}
              />
            </View>

            <View ref={storyRef} collapsable={false} style={styles.storyCard}>
              <LinearGradient colors={["#161628", "#111118", "#0C0C12"]} style={StyleSheet.absoluteFill} />
              <View style={styles.storyBrandRow}>
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                <Text style={styles.storyBrand}>MySaloon x Morf AI</Text>
              </View>
              <Text style={styles.storyHeadline}>
                {storyData?.progress_headline ||
                  t("care.album.story.progressTag", {
                    defaultValue: "{{count}} Kunlik Soch Parvarishi Natijasi",
                    count: journey?.days ?? 0,
                  })}
              </Text>

              <View style={styles.storyFrames}>
                <StoryFrame
                  label={t("care.album.story.before", { defaultValue: "OLDIN" })}
                  imageUrl={journey?.before.imageUrl || ""}
                  date={journey?.before.takenAt}
                  locale={i18n.language || "uz"}
                />
                <StoryFrame
                  label={t("care.album.story.after", { defaultValue: "KEYIN" })}
                  imageUrl={journey?.after.imageUrl || ""}
                  date={journey?.after.takenAt}
                  locale={i18n.language || "uz"}
                />
              </View>

              <View style={styles.storyProductsBox}>
                <Text style={styles.storyProductsLabel}>
                  {t("care.album.story.products", { defaultValue: "Care Routine" })}
                </Text>
                <View style={styles.storyProductsRow}>
                  {(journeyProducts.length ? journeyProducts : selectedNames).slice(0, 3).map((product) => (
                    <View key={product} style={styles.storyProductChip}>
                      <Text style={styles.storyProductText}>{product}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.verdictBox}>
                {storyLoading ? (
                  <ActivityIndicator color="#C4B5FD" />
                ) : storyError ? (
                  <>
                    <Text style={styles.verdictText}>{storyError}</Text>
                    <Pressable onPress={() => void runStoryAi()} style={styles.retryBtn}>
                      <Text style={styles.retryText}>{t("common.retry", { defaultValue: "Qayta urinish" })}</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.growthTag}>{storyData?.growth_tag || "+15% Zichlik"}</Text>
                    <Text style={styles.verdictText}>
                      {storyData?.ai_verdict ||
                        t("care.album.story.verdictFallback", {
                          defaultValue: "Sochdagi ijobiy o'zgarishlar sezilarli darajada yaxshilandi.",
                        })}
                    </Text>
                  </>
                )}
              </View>
              <Text style={styles.storyFooter}>MySaloon.uz</Text>
            </View>

            <Pressable
              style={styles.shareBtn}
              onPress={() => void onShareStory()}
              disabled={exporting || storyLoading}
            >
              {exporting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>
                    {t("care.album.story.share", { defaultValue: "Instagram Story-ga joylash" })}
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={styles.saveBtn}
              onPress={() => void onSaveStory()}
              disabled={exporting || storyLoading}
            >
              <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {t("care.album.story.save", { defaultValue: "Galereyaga saqlash" })}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </SafeModal>
    </>
  );
}

function StoryFrame({
  label,
  imageUrl,
  date,
  locale,
}: {
  label: string;
  imageUrl: string;
  date?: Date;
  locale: string;
}) {
  return (
    <View style={styles.frame}>
      <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.75)"]} style={styles.frameGradient} />
      <View style={styles.frameCopy}>
        <Text style={styles.frameLabel}>{label}</Text>
        {date ? <Text style={styles.frameDate}>{formatDate(date, locale)}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageScroll: { flex: 1, minHeight: 0 },
  loadingWrap: { gap: moderateScale(10), marginTop: verticalScale(8) },
  loadingGrid: { flexDirection: "row", gap: moderateScale(8) },
  badge: {
    ...morphFont, fontWeight: "500",
    fontSize: fontSize(12),
    color: "rgba(17,17,17,0.35)",
    letterSpacing: 0.4,
  },
  title: {
    marginTop: verticalScale(6),
    ...morphFont, fontWeight: "700",
    fontSize: fontSize(24),
    color: "#111111",
    letterSpacing: -0.4,
  },
  metricsRow: { flexDirection: "row", gap: moderateScale(8), marginTop: verticalScale(14) },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
  },
  metricLabel: { ...morphFont, fontWeight: "500", fontSize: fontSize(12), color: "rgba(17,17,17,0.45)" },
  metricValue: {
    marginTop: verticalScale(4),
    ...morphFont, fontWeight: "700",
    fontSize: fontSize(18),
    color: "#111111",
  },
  resultCard: {
    marginTop: verticalScale(14),
    borderRadius: moderateScale(22),
    overflow: "hidden",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
  },
  resultEyebrow: {
    ...morphFont, fontWeight: "500",
    fontSize: fontSize(11),
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  resultTitle: {
    marginTop: verticalScale(4),
    ...morphFont, fontWeight: "700",
    fontSize: fontSize(17),
    color: "#FFFFFF",
  },
  resultCtaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: verticalScale(8) },
  resultCta: { ...morphFont, fontWeight: "700", fontSize: fontSize(13), color: "rgba(255,255,255,0.9)" },
  helperCard: {
    marginTop: verticalScale(14),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.1)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
  },
  helperText: { ...morphFont, fontWeight: "500", fontSize: fontSize(13), color: "rgba(17,17,17,0.65)" },
  productsSection: { marginTop: verticalScale(18) },
  sectionLabel: {
    ...morphFont, fontWeight: "500",
    fontSize: fontSize(12),
    color: "rgba(17,17,17,0.35)",
    marginBottom: verticalScale(8),
  },
  chipRow: { gap: moderateScale(8), paddingRight: scale(8) },
  chip: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    maxWidth: scale(180),
  },
  chipOn: { backgroundColor: "#111111" },
  chipText: { ...morphFont, fontWeight: "500", fontSize: fontSize(12), color: "rgba(17,17,17,0.65)" },
  chipTextOn: { color: "#FFFFFF" },
  gridSection: { marginTop: verticalScale(18) },
  groupBlock: { marginBottom: verticalScale(14) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(8) },
  photoCard: { backgroundColor: "#FFFFFF", borderRadius: moderateScale(16), overflow: "hidden" },
  photoWrap: { borderRadius: moderateScale(16), overflow: "hidden" },
  photoGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%" },
  photoDate: {
    position: "absolute",
    left: scale(8),
    bottom: verticalScale(8),
    ...morphFont, fontWeight: "500",
    fontSize: fontSize(11),
    color: "rgba(255,255,255,0.9)",
  },
  badgeRow: { minHeight: verticalScale(34), paddingHorizontal: scale(8), paddingVertical: verticalScale(8), gap: 4 },
  productBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#F3F3F3",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    maxWidth: "100%",
  },
  productBadgeText: { ...morphFont, fontWeight: "500", fontSize: fontSize(10), color: "rgba(17,17,17,0.7)" },
  noProducts: { ...morphFont, fontWeight: "500", fontSize: fontSize(10), color: "rgba(17,17,17,0.4)" },
  emptyCard: {
    alignItems: "center",
    borderRadius: moderateScale(22),
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(17,17,17,0.15)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(28),
  },
  emptyTitle: {
    marginTop: verticalScale(8),
    ...morphFont, fontWeight: "700",
    fontSize: fontSize(14),
    color: "rgba(17,17,17,0.7)",
    textAlign: "center",
  },
  emptySub: {
    marginTop: verticalScale(4),
    ...morphFont, fontWeight: "500",
    fontSize: fontSize(13),
    color: "rgba(17,17,17,0.45)",
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: scale(16),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    backgroundColor: "#111111",
    borderRadius: 999,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fabText: { ...morphFont, fontWeight: "700", fontSize: fontSize(13), color: "#FFFFFF" },
  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
  },
  sheetHandle: {
    alignSelf: "center",
    width: scale(42),
    height: verticalScale(4),
    borderRadius: 999,
    backgroundColor: "#E5E5E5",
    marginBottom: verticalScale(12),
  },
  sheetTitle: { ...morphFont, fontWeight: "700", fontSize: fontSize(18), color: "#111111" },
  sheetSub: {
    marginTop: verticalScale(4),
    ...morphFont, fontWeight: "500",
    fontSize: fontSize(13),
    color: "rgba(17,17,17,0.55)",
  },
  selectedWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: verticalScale(12) },
  selectedChip: {
    borderRadius: 999,
    backgroundColor: "#F3F3F3",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  selectedChipText: { ...morphFont, fontWeight: "500", fontSize: fontSize(11), color: "#111111" },
  primaryBtn: {
    marginTop: verticalScale(16),
    height: verticalScale(48),
    borderRadius: moderateScale(16),
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { ...morphFont, fontWeight: "700", fontSize: fontSize(14), color: "#FFFFFF" },
  storyRoot: { flex: 1, backgroundColor: "#0B0B0F" },
  storyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(14),
    paddingBottom: verticalScale(8),
  },
  storyHeaderTitle: { ...morphFont, fontWeight: "700", fontSize: fontSize(15), color: "#FFFFFF" },
  storyClose: {
    width: scale(34),
    height: scale(34),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  interactiveLabel: {
    paddingHorizontal: scale(14),
    ...morphFont, fontWeight: "500",
    fontSize: fontSize(12),
    color: "rgba(255,255,255,0.55)",
    marginBottom: verticalScale(8),
  },
  compareWrap: { alignItems: "center", marginBottom: verticalScale(14) },
  storyCard: {
    marginHorizontal: scale(14),
    borderRadius: moderateScale(24),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: moderateScale(12),
    aspectRatio: 9 / 16,
  },
  storyBrandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  storyBrand: { ...morphFont, fontWeight: "700", fontSize: fontSize(11), color: "#FFFFFF" },
  storyHeadline: {
    marginTop: verticalScale(8),
    ...morphFont, fontWeight: "700",
    fontSize: fontSize(12),
    color: "rgba(255,255,255,0.85)",
  },
  storyFrames: { flexDirection: "row", gap: moderateScale(8), marginTop: verticalScale(10), flex: 1 },
  frame: { flex: 1, borderRadius: moderateScale(14), overflow: "hidden", minHeight: verticalScale(150) },
  frameGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%" },
  frameCopy: { position: "absolute", left: scale(8), right: scale(8), bottom: verticalScale(8) },
  frameLabel: {
    ...morphFont, fontWeight: "700",
    fontSize: fontSize(10),
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1,
  },
  frameDate: { marginTop: 2, ...morphFont, fontWeight: "500", fontSize: fontSize(10), color: "rgba(255,255,255,0.75)" },
  storyProductsBox: {
    marginTop: verticalScale(10),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
  },
  storyProductsLabel: {
    ...morphFont, fontWeight: "500",
    fontSize: fontSize(10),
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  storyProductsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: verticalScale(6) },
  storyProductChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  storyProductText: { ...morphFont, fontWeight: "500", fontSize: fontSize(10), color: "#FFFFFF" },
  verdictBox: {
    marginTop: verticalScale(8),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.35)",
    backgroundColor: "rgba(139,92,246,0.15)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    minHeight: verticalScale(54),
    justifyContent: "center",
  },
  growthTag: { ...morphFont, fontWeight: "700", fontSize: fontSize(11), color: "#C4B5FD" },
  verdictText: {
    marginTop: verticalScale(4),
    ...morphFont, fontWeight: "500",
    fontSize: fontSize(12),
    color: "rgba(255,255,255,0.9)",
  },
  retryBtn: {
    marginTop: verticalScale(8),
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  retryText: { ...morphFont, fontWeight: "700", fontSize: fontSize(12), color: "#FFFFFF" },
  storyFooter: {
    marginTop: verticalScale(8),
    textAlign: "center",
    ...morphFont, fontWeight: "700",
    fontSize: fontSize(11),
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.2,
  },
  shareBtn: {
    marginHorizontal: scale(14),
    marginTop: verticalScale(14),
    height: verticalScale(48),
    borderRadius: moderateScale(16),
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  shareBtnText: { ...morphFont, fontWeight: "700", fontSize: fontSize(14), color: "#FFFFFF" },
  saveBtn: {
    marginHorizontal: scale(14),
    marginTop: verticalScale(8),
    height: verticalScale(48),
    borderRadius: moderateScale(16),
    backgroundColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  saveBtnText: { ...morphFont, fontWeight: "700", fontSize: fontSize(14), color: "#FFFFFF" },
});
