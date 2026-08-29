import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useProfileData } from "../../hooks/useProfileData";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "Orders">;

export function OrdersScreen({ navigation }: Props) {
  const data = useProfileData();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const count = tab === "upcoming" ? data.upcomingCount : data.historyCount;

  return (
    <View style={styles.root}>
      <NativeHeader
        title="Buyurtmalarim"
        onBack={() => navigation.goBack()}
        largeTitle
        border={false}
      />

      <View style={styles.body}>
        <SegmentedTabs
          tabs={[
            { key: "upcoming", label: `Kelayotgan ${data.upcomingCount}` },
            { key: "history", label: `Tarix ${data.historyCount}` },
          ]}
          active={tab}
          onChange={(k) => setTab(k as "upcoming" | "history")}
        />

        {count === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyGlow}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={32} color={colors.muted} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Hali bron yo'q</Text>
            <Text style={styles.emptySub}>
              Yaqin atrofdagi salonlardan vaqtni tanlab, birinchi broningizni qiling.
            </Text>
            <Pressable
              style={styles.cta}
              onPress={() => navigation.getParent()?.navigate("Home" as never)}
            >
              <Ionicons name="calendar" size={18} color="#FFF" />
              <Text style={styles.ctaText}>Bron qilish</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.listHint}>{count} ta buyurtma</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: scale(16), paddingTop: verticalScale(8) },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: verticalScale(80),
    paddingHorizontal: scale(24),
  },
  emptyGlow: {
    width: scale(120),
    height: scale(120),
    borderRadius: moderateScale(60),
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(18),
  },
  emptyIcon: {
    width: scale(72),
    height: scale(72),
    borderRadius: moderateScale(20),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: fontSize(20),
    fontWeight: "800",
    color: colors.fg,
    marginBottom: verticalScale(8),
  },
  emptySub: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: colors.muted,
    textAlign: "center",
    marginBottom: verticalScale(20),
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    backgroundColor: colors.fg,
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(14),
  },
  ctaText: { color: "#FFF", fontSize: fontSize(15), fontWeight: "700" },
  listHint: { marginTop: verticalScale(24), color: colors.muted, fontSize: fontSize(14) },
});
