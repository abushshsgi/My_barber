import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  fontSize,
} from "../../utils/responsive";

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
    void loadCareQuiz().then((saved) => {
      if (saved) setQuiz(saved);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchCareProduct(productId)
      .then((row) => {
        if (alive) setData(row);
        if (alive) {
          void isMyProduct(productId).then((mine) => setInMyProducts(mine));
        }
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
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const names = navigation.getState?.()?.routeNames ?? [];
    if (names.includes("CareHome")) {
      navigation.navigate("CareHome", { openSearch: true });
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <ActivityIndicator color="#111111" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Text style={styles.empty}>{t("care.catalog.notFound")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <CareProductPreviewSheet
        mode="page"
        product={data}
        quiz={quiz}
        added={inMyProducts}
        bottomInset={Math.max(insets.bottom, 12)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { alignItems: "center", justifyContent: "center" },
  empty: {
    textAlign: "center",
    ...morphFont,
    fontSize: fontSize(14),
    color: "#64748B",
  },
});
