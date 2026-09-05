import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
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
import { HairGrowthTrackerSheet } from "../../components/morph/care/HairGrowthTrackerSheet";
import { AppStatusBar } from "../../components/ui/AppStatusBar";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  loadMyProducts,
  type MyCareProduct,
} from "../../lib/morph-my-products";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareGrowthTracker">;

export function MorphCareGrowthTrackerScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setMyProducts(await loadMyProducts());
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + verticalScale(8),
          paddingHorizontal: scale(14),
          paddingBottom: Math.max(insets.bottom, 18) + verticalScale(28),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              const routes = navigation.getState?.()?.routes;
              if (routes && routes.length > 1) navigation.goBack();
              else navigation.navigate("CareHome");
            }}
            hitSlop={8}
            accessibilityLabel={t("common.back")}
          >
            <Ionicons name="chevron-back" size={20} color="#111111" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>
              {t("care.growthTracker.title", { defaultValue: "Hair Growth & Health Tracker" })}
            </Text>
            <Text style={styles.sub}>
              {t("care.growthTracker.sub", { defaultValue: "3 oylik progress va AI prognoz" })}
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#111111" />
          </View>
        ) : (
          <HairGrowthTrackerSheet myProducts={myProducts} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  scroll: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
    gap: moderateScale(10),
  },
  backBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: moderateScale(11),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: scale(4) },
  title: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "800",
    color: "#111111",
    textAlign: "center",
  },
  sub: {
    ...morphFont,
    marginTop: 1,
    fontSize: fontSize(11),
    color: "rgba(17,17,17,0.55)",
    textAlign: "center",
  },
  loadingWrap: {
    minHeight: verticalScale(220),
    alignItems: "center",
    justifyContent: "center",
  },
});
