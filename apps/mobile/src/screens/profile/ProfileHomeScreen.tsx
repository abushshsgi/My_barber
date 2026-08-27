import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
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
import { useProfileDashboard } from "../../hooks/useProfileDashboard";
import { TAB_DOCK_CLEARANCE } from "../../hooks/useHideTabBar";
import { useAuth } from "../../auth/AuthContext";
import { planLabel } from "../../api/dashboard";
import { formatSom, initials } from "../../api/user";
import { useAppShell } from "../../lib/AppShellContext";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";
import { MorphProfileScreen } from "./MorphProfileScreen";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

const QUICK = [
  { key: "Orders", label: "Buyurtmalar", icon: "calendar-outline" as const },
  { key: "Notifications", label: "Bildirishnomalar", icon: "notifications-outline" as const },
  { key: "Addresses", label: "Manzillar", icon: "location-outline" as const },
  { key: "Settings", label: "Sozlamalar", icon: "settings-outline" as const },
] as const;

export function ProfileHomeScreen(props: Props) {
  const { shell } = useAppShell();
  if (shell === "morph") {
    return <MorphProfileScreen {...props} />;
  }
  return <MysaloonProfileHome {...props} />;
}

function MysaloonProfileHome({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { dashboard, unreadCount, loading, refresh } = useProfileDashboard();
  const { signOut, user: authUser } = useAuth();
  const { setShell, rememberTab } = useAppShell();
  const user = dashboard?.user ?? authUser;
  const display =
    user?.full_name?.trim() ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    "Foydalanuvchi";
  const verified = dashboard?.verified ?? Boolean(user?.phone || user?.email_verified);
  const sub = dashboard?.subscription;
  const wallet = dashboard?.wallet;
  const upcoming = dashboard?.mysaloon.upcoming_bookings ?? 0;
  const history = dashboard?.mysaloon.history_bookings ?? 0;
  const favorites = dashboard?.mysaloon.favorites ?? 0;
  const plan = planLabel(sub);

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_DOCK_CLEARANCE + Math.max(insets.bottom, 16) + 40 },
        ]}
        refreshControl={
          <RefreshControl refreshing={loading && !!dashboard} onRefresh={refresh} />
        }
      >
        <View style={styles.topRow}>
          <HeaderPill
            label="Bonus · tez orada"
            icon={<Ionicons name="star" size={13} color={colors.fg} />}
          />
          <HeaderPill
            label={sub?.has_active ? plan : "Obuna"}
            dark
            icon={<Ionicons name="diamond" size={13} color="#FFF" />}
            onPress={() => navigation.navigate("Subscriptions")}
          />
        </View>

        <View style={styles.hero}>
          <View style={styles.avatar}>
            {loading && !dashboard ? (
              <ActivityIndicator color={colors.fg} />
            ) : (
              <Text style={styles.avatarText}>{initials(display)}</Text>
            )}
          </View>
          <Pressable
            style={styles.nameRow}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.name}>{display}</Text>
            {verified ? (
              <Ionicons name="checkmark-circle" size={18} color="#007AFF" />
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
          <View style={styles.audiencePill}>
            <Text style={styles.audienceText}>
              {sub?.has_active ? `${plan} · MySaloon` : "MySaloon"}
            </Text>
          </View>
          <Text style={styles.stats}>
            {upcoming + history} bron · {favorites} sevimli
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
                else if (item.key === "Notifications") navigation.navigate("Notifications");
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
            subtitle={formatSom(wallet?.balance ?? 0)}
            icon="wallet-outline"
            iconDark
            darkText
            onPress={() => {
              setShell("mysaloon");
              rememberTab("mysaloon", "Profile");
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
            badge={unreadCount}
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

        <Text style={styles.guestHint}>
          Shu akkaunt Morf AI try-on va MySaloon bronlari uchun bir xil
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: TAB_DOCK_CLEARANCE + 28, gap: 4 },
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
