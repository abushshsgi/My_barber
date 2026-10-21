import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom } from "../../lib/safe-area";
import { AppStatusBar } from "../../components/ui/AppStatusBar";
import { NativeBackButton, NativeBackSpacer } from "../../components/ui/NativeBackButton";
import { useHideTabBar } from "../../hooks/useHideTabBar";
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
            {t("care.growthTracker.titleShort", { defaultValue: "O'sish" })}
          </Text>
        </View>
        <NativeBackSpacer />
      </View>

      <View style={[styles.body, { paddingBottom: safeBottom(insets.bottom, 24) }]}>
        <View style={styles.blockedCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles-outline" size={32} color={SOFT_PAPER.fg} />
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {t("profile.soon", { defaultValue: "TEZ ORADA" }).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.blockedTitle}>
            {t("care.growthTracker.soonTitle", { defaultValue: "Soch o'sish trackeri tez orada" })}
          </Text>
          <Text style={styles.blockedDesc}>
            {t("care.growthTracker.soonDesc", {
              defaultValue:
                "Ushbu bo'lim ustida ishlayapmiz. Tez orada soch o'sish dinamikasi, 3 oylik AI prognozi va check-in moduli ishga tushadi.",
            })}
          </Text>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              const routes = navigation.getState?.()?.routes;
              if (routes && routes.length > 1) navigation.goBack();
              else navigation.navigate("CareHome");
            }}
          >
            <Text style={styles.backBtnText}>
              {t("common.back", { defaultValue: "Orqaga qaytish" })}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: SOFT_PAPER.bg },
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
  body: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: scale(16),
    justifyContent: "center",
    alignItems: "center",
  },
  blockedCard: {
    width: "100%",
    maxWidth: scale(340),
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(24),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(32),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: verticalScale(4) },
    elevation: 2,
  },
  iconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: moderateScale(20),
    backgroundColor: "rgba(17,17,17,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
  },
  pill: {
    backgroundColor: "rgba(17,17,17,0.08)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(999),
    marginBottom: verticalScale(10),
  },
  pillText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "800",
    color: "rgba(17,17,17,0.65)",
    letterSpacing: 0.5,
  },
  blockedTitle: {
    ...morphFont,
    fontSize: fontSize(17),
    fontWeight: "800",
    color: SOFT_PAPER.fg,
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  blockedDesc: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    color: "rgba(17,17,17,0.55)",
    textAlign: "center",
    marginBottom: verticalScale(20),
  },
  backBtn: {
    height: verticalScale(42),
    paddingHorizontal: scale(24),
    backgroundColor: SOFT_PAPER.fg,
    borderRadius: moderateScale(999),
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
