import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { HairGrowthTrackerSheet } from "../../components/morph/care/HairGrowthTrackerSheet";
import { AppStatusBar } from "../../components/ui/AppStatusBar";
import { NativeBackButton, NativeBackSpacer } from "../../components/ui/NativeBackButton";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  loadMyProducts,
  type MyCareProduct,
} from "../../lib/morph-my-products";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { SOFT_PAPER } from "../../theme/morph-appearance";
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
            {t("care.growthTracker.titleShort", { defaultValue: "O'sish tracker" })}
          </Text>
        </View>
        <NativeBackSpacer />
      </View>

      <View style={[styles.body, { paddingBottom: safeBottom(insets.bottom, 0) }]}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={SOFT_PAPER.fg} />
          </View>
        ) : (
          <HairGrowthTrackerSheet myProducts={myProducts} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT_PAPER.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(14),
    gap: moderateScale(10),
    marginBottom: verticalScale(6),
  },
  headerCenter: { flex: 1, minWidth: 0, alignItems: "center" },
  title: {
    ...morphFont,
    fontWeight: "800",
    fontSize: fontSize(17),
    color: SOFT_PAPER.fg,
    textAlign: "center",
  },
  body: { flex: 1, paddingHorizontal: scale(14) },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
