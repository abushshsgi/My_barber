import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CareAlbumContent } from "../../components/morph/care/CareAlbumContent";
import { AppStatusBar } from "../../components/ui/AppStatusBar";
import { NativeBackButton, NativeBackSpacer } from "../../components/ui/NativeBackButton";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { loadCareQuiz } from "../../lib/morph-ai-care";
import { loadMyProducts, type MyCareProduct } from "../../lib/morph-my-products";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareAlbum">;

export function MorphCareAlbumScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);
  const [goalHint, setGoalHint] = useState("Soch parvarishi");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [products, quiz] = await Promise.all([
        loadMyProducts(),
        loadCareQuiz().catch(() => null),
      ]);
      setMyProducts(products);
      if (quiz?.condition) {
        setGoalHint(`${quiz.condition} · ${quiz.texture || "parvarish"}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <View style={styles.root}>
      <AppStatusBar style="dark" />
      <LinearGradient
        colors={["#FAFAFA", "#F6F4EF", "#FAFAFA"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + verticalScale(8) }]}>
        <NativeBackButton
          onPress={() => {
            const routes = navigation.getState?.()?.routes;
            if (routes && routes.length > 1) navigation.goBack();
            else navigation.navigate("CareHome");
          }}
          accessibilityLabel={t("common.back")}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.title}>
            {t("care.album.screenTitle", { defaultValue: "Parvarish Albomi" })}
          </Text>
          <Text style={styles.sub}>
            {t("care.album.screenSub", { defaultValue: "Before/After story va progress" })}
          </Text>
        </View>
        <NativeBackSpacer />
      </View>

      <View style={[styles.body, { paddingHorizontal: scale(14) }]}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#111111" />
          </View>
        ) : (
          <CareAlbumContent fallbackProducts={myProducts} goalHint={goalHint} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: "#FAFAFA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(14),
    gap: moderateScale(10),
  },
  headerCenter: { flex: 1, minWidth: 0 },
  title: {
    ...morphFont,
    fontWeight: "700",
    fontSize: fontSize(17),
    color: "#111111",
    textAlign: "center",
  },
  sub: {
    marginTop: 2,
    ...morphFont,
    fontWeight: "500",
    fontSize: fontSize(12),
    color: "rgba(17,17,17,0.45)",
    textAlign: "center",
  },
  body: { flex: 1, minHeight: 0 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
});
