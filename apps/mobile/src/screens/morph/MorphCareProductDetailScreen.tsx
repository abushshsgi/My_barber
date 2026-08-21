import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCareProduct, type CareProduct } from "../../api/care";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareProductDetail">;

export function MorphCareProductDetailScreen({ navigation, route }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const productId = route.params.productId;
  const [data, setData] = useState<CareProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchCareProduct(productId)
      .then((row) => {
        if (alive) setData(row);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [productId]);

  const tagLabel = (tag: string) => t(`care.catalog.tags.${tag}`, { defaultValue: tag });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: Math.max(insets.bottom, 28),
        paddingHorizontal: 20,
      }}
    >
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="rgba(255,255,255,0.4)" />
        </View>
      ) : !data ? (
        <Text style={styles.empty}>{t("care.catalog.notFound")}</Text>
      ) : (
        <View style={{ marginTop: 20 }}>
          {data.image_url ? (
            <Image source={{ uri: data.image_url }} style={styles.hero} contentFit="cover" />
          ) : null}
          <Text style={styles.badge}>
            {t(`care.catalog.categories.${data.category}`, { defaultValue: data.category })}
          </Text>
          <Text style={styles.h1}>{data.name}</Text>
          {data.brand ? <Text style={styles.brand}>{data.brand}</Text> : null}

          <Block title={t("care.catalog.purpose")}>{data.purpose_uz || "—"}</Block>
          <Block title={t("care.catalog.usage")}>{data.usage_uz || "—"}</Block>
          <Block title={t("care.catalog.who")}>
            {(data.suitable_for || []).length
              ? data.suitable_for.map(tagLabel).join(", ")
              : "—"}
          </Block>
          {data.not_suitable_for?.length ? (
            <Block title={t("care.catalog.whoNot")}>
              {data.not_suitable_for.map(tagLabel).join(", ")}
            </Block>
          ) : null}
          <Block title={t("care.catalog.pros")}>{data.pros_uz || "—"}</Block>
          <Block title={t("care.catalog.cons")}>{data.cons_uz || "—"}</Block>
          {data.warnings_uz ? (
            <Block title={t("care.catalog.warnings")}>{data.warnings_uz}</Block>
          ) : null}
          <Block title={t("care.catalog.ingredients")}>
            {data.ingredients_text || (data.ingredients || []).join(", ") || "—"}
          </Block>
        </View>
      )}
    </ScrollView>
  );
}

function Block({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <Text style={styles.blockBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  center: { minHeight: 240, alignItems: "center", justifyContent: "center" },
  empty: {
    marginTop: 64,
    textAlign: "center",
    ...morphFont,
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  hero: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
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
    fontSize: 28,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.5,
  },
  brand: {
    marginTop: 4,
    ...morphFont,
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
  },
  block: { marginTop: 28 },
  blockTitle: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
  },
  blockBody: {
    marginTop: 8,
    ...morphFont,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.75)",
  },
});
