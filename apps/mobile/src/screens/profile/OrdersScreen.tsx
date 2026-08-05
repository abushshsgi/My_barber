import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useProfileData } from "../../hooks/useProfileData";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";

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
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  emptyGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.fg,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 20,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.fg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  ctaText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  listHint: { marginTop: 24, color: colors.muted, fontSize: 14 },
});
