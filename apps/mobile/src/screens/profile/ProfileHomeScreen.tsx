import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderPill } from "../../components/ui/NativeHeader";
import { SettingsGroup, SettingsRow } from "../../components/ui/SettingsKit";
import { useProfileData } from "../../hooks/useProfileData";
import { useAuth } from "../../auth/AuthContext";
import { formatSom, initials } from "../../api/user";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

const QUICK = [
  { key: "Orders", label: "Buyurtmalar", icon: "calendar-outline" as const },
  { key: "Referrals", label: "Referrals", icon: "person-add-outline" as const },
  { key: "Addresses", label: "Manzillar", icon: "location-outline" as const },
  { key: "Settings", label: "Sozlamalar", icon: "settings-outline" as const },
] as const;

export function ProfileHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const data = useProfileData();
  const { signOut, user: authUser } = useAuth();
  const display = authUser
    ? authUser.full_name ||
      [authUser.first_name, authUser.last_name].filter(Boolean).join(" ") ||
      data.name
    : data.name;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={data.loading} onRefresh={data.refresh} />
        }
      >
        <View style={styles.topRow}>
          <HeaderPill
            label="Bonus · tez orada"
            icon={<Ionicons name="star" size={13} color={colors.fg} />}
          />
          <HeaderPill
            label="Obuna"
            dark
            icon={<Ionicons name="diamond" size={13} color="#FFF" />}
            onPress={() => navigation.navigate("Subscriptions")}
          />
        </View>

        <View style={styles.hero}>
          <View style={styles.avatar}>
            {data.loading ? (
              <ActivityIndicator color={colors.fg} />
            ) : (
              <Text style={styles.avatarText}>{initials(display)}</Text>
            )}
          </View>
          <Pressable
            style={styles.nameRow}
            onPress={() => navigation.navigate("PersonalInfo")}
          >
            <Text style={styles.name}>{display}</Text>
            <Ionicons name="checkmark-circle" size={18} color="#007AFF" />
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
          <View style={styles.audiencePill}>
            <Text style={styles.audienceText}>Hammasi</Text>
          </View>
          <Text style={styles.stats}>
            {data.upcomingCount + data.historyCount} bron · {data.favoritesCount} sevimli · 0
            sharh
          </Text>
        </View>

        <View style={styles.quickRow}>
          {QUICK.map((item) => (
            <Pressable
              key={item.key}
              style={styles.quickItem}
              onPress={() => {
                if (item.key === "Orders") navigation.navigate("Orders");
                else if (item.key === "Settings") navigation.navigate("Settings");
                else if (item.key === "Addresses") navigation.navigate("Settings");
              }}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={item.icon} size={22} color={colors.fg} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <SettingsGroup dark>
          <SettingsRow
            title="Hamyon"
            subtitle={formatSom(data.wallet?.balance ?? 0)}
            icon="wallet-outline"
            iconDark
            darkText
            onPress={() => {
              try {
                navigation.navigate("WalletGate");
              } catch {
                navigation.navigate("WalletHome");
              }
            }}
            last
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            title="Faoliyatim"
            subtitle="Sharhlar, sevimlilar, ustalar, sovg'a"
            icon="calendar-outline"
            onPress={() => navigation.navigate("Orders")}
          />
          <SettingsRow
            title="Aksiyalar"
            subtitle="Tez orada"
            icon="pricetag-outline"
            last
          />
        </SettingsGroup>

        <SettingsGroup dark>
          <SettingsRow
            title="Bonus dasturi"
            subtitle="Tez orada"
            icon="sparkles"
            iconDark
            darkText
            onPress={() => undefined}
            last
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            title="Maxfiylik"
            icon="shield-checkmark-outline"
            onPress={() => navigation.navigate("Settings")}
          />
          <SettingsRow
            title="Bildirishnomalar"
            icon="notifications-outline"
            badge={data.unreadCount}
            onPress={() => navigation.navigate("Notifications")}
            last
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            title="Ma'lumot"
            icon="information-circle-outline"
            onPress={() => navigation.navigate("Settings")}
            last
          />
        </SettingsGroup>

        <Pressable style={styles.logout} onPress={() => void signOut()}>
          <Ionicons name="log-out-outline" size={18} color={colors.fg} />
          <Text style={styles.logoutText}>Chiqish</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 4 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  hero: { alignItems: "center", marginBottom: 22 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: colors.fg },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 17, fontWeight: "800", color: colors.fg, letterSpacing: -0.3 },
  audiencePill: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  audienceText: { fontSize: 12, fontWeight: "600", color: colors.fg },
  stats: { marginTop: 8, fontSize: 13, color: colors.muted },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  quickItem: { alignItems: "center", width: "23%", gap: 8 },
  quickIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11, fontWeight: "600", color: colors.fg, textAlign: "center" },
  logout: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.bg,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: colors.fg },
  guestHint: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
});
