import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchCareProducts,
  type CareProduct,
  type CareProductCategory,
} from "../../api/care";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareProducts">;

const CATEGORIES: CareProductCategory[] = [
  "shampoo",
  "balsam",
  "mask",
  "oil",
  "spray",
  "other",
];

export function MorphCareProductsScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [rows, setRows] = useState<CareProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCareProducts({
        q: q.trim() || undefined,
        category: category === "all" ? undefined : category,
        recommended: true,
      });
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.pad}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.badge}>{t("care.catalog.badge")}</Text>
        <Text style={styles.h1}>{t("care.catalog.title")}</Text>
        <Text style={styles.sub}>{t("care.catalog.subtitle")}</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.35)" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("care.catalog.search")}
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={styles.search}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <Chip
            active={category === "all"}
            label={t("care.catalog.all")}
            onPress={() => setCategory("all")}
          />
          {CATEGORIES.map((key) => (
            <Chip
              key={key}
              active={category === key}
              label={t(`care.catalog.categories.${key}`)}
              onPress={() => setCategory(key)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="rgba(255,255,255,0.4)" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 24),
            gap: 8,
          }}
        >
          {rows.length === 0 ? (
            <Text style={styles.empty}>{t("care.catalog.empty")}</Text>
          ) : (
            rows.map((row) => (
              <Pressable
                key={row.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("CareProductDetail", { productId: row.id })
                }
              >
                {row.image_url ? (
                  <Image source={{ uri: row.image_url }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]} />
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {row.brand || t(`care.catalog.categories.${row.category}`)}
                  </Text>
                  {row.purpose_uz ? (
                    <Text style={styles.cardHint} numberOfLines={2}>
                      {row.purpose_uz}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  pad: { paddingHorizontal: 20 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    marginTop: 20,
    ...morphFont,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
  },
  h1: {
    marginTop: 8,
    ...morphFont,
    fontSize: 26,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 10,
    ...morphFont,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.55)",
  },
  searchWrap: {
    marginTop: 20,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  search: { flex: 1, ...morphFont, fontSize: 14, color: "#fff", paddingVertical: 0 },
  chips: { marginTop: 14, marginBottom: 12, maxHeight: 40 },
  chip: {
    marginRight: 8,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: "#fff" },
  chipText: { ...morphFont, fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.7)" },
  chipTextOn: { color: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    marginTop: 48,
    textAlign: "center",
    ...morphFont,
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  thumbEmpty: { backgroundColor: "rgba(255,255,255,0.1)" },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { ...morphFont, fontSize: 15, fontWeight: "600", color: "#fff" },
  cardMeta: {
    marginTop: 2,
    ...morphFont,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  cardHint: {
    marginTop: 4,
    ...morphFont,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
});
