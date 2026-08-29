import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCareProduct, type CareProduct } from "../../api/care";
import { CareProductPreviewSheet } from "../../components/morph/care/CareProductPreviewSheet";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  defaultQuiz,
  loadCareQuiz,
  type CareQuizAnswers,
} from "../../lib/morph-ai-care";
import { addMyProduct, careProductToMy, isMyProduct } from "../../lib/morph-my-products";
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
  const [inMyProducts, setInMyProducts] = useState(false);
  const [adding, setAdding] = useState(false);
  const [quiz, setQuiz] = useState<CareQuizAnswers>(defaultQuiz());

  useEffect(() => {
    void loadCareQuiz().then(setQuiz);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchCareProduct(productId)
      .then((row) => {
        if (alive) setData(row);
        if (alive) void isMyProduct(productId).then(setInMyProducts);
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

  const goBack = () => {
    const routes = navigation.getState?.()?.routes;
    if (routes && routes.length > 1) navigation.goBack();
    else navigation.navigate("CareProducts");
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#4F46E5" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingHorizontal: 20 }]}>
        <Pressable style={styles.back} onPress={goBack}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.empty}>{t("care.catalog.notFound")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4 }]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.back}
          onPress={goBack}
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {t("care.catalog.badge")}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <CareProductPreviewSheet
          mode="page"
          product={data}
          quiz={quiz}
          added={inMyProducts}
          bottomInset={0}
          onClose={goBack}
          onAdd={() => {
            if (inMyProducts || adding) return;
            setAdding(true);
            void addMyProduct(careProductToMy(data, "catalog"))
              .then(() => {
                setInMyProducts(true);
                Alert.alert(t("care.myProducts.addedTitle"), t("care.myProducts.addedSub"));
              })
              .finally(() => setAdding(false));
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  empty: {
    marginTop: 64,
    textAlign: "center",
    ...morphFont,
    fontSize: 14,
    color: "#64748B",
  },
});
