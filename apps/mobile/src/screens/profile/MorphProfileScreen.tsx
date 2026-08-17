import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
import { planLabel } from "../../api/dashboard";
import { resolveMediaUrl } from "../../api/media";
import { formatSom, initials } from "../../api/user";
import { useAuth } from "../../auth/AuthContext";
import { morfWordmarkWhite } from "../../branding/morf-logo";
import { useProfileDashboard } from "../../hooks/useProfileDashboard";
import { TAB_DOCK_CLEARANCE } from "../../hooks/useHideTabBar";
import { openMorphStack } from "../../lib/profile-nav";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

const BG = "#070708";
const SURFACE = "rgba(255,255,255,0.055)";
const SURFACE_STRONG = "rgba(255,255,255,0.09)";
const LINE = "rgba(255,255,255,0.1)";
const MUTED = "rgba(255,255,255,0.52)";
const GOLD = "#D4AF37";

export function MorphProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { signOut, user: authUser } = useAuth();
  const { dashboard, unreadCount, loading, error, refresh } = useProfileDashboard();

  const user = dashboard?.user ?? authUser;
  const display =
    user?.full_name?.trim() ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    "Foydalanuvchi";
  const avatarUrl = resolveMediaUrl(user?.avatar, { width: 240 });
  const verified = dashboard?.verified ?? Boolean(user?.phone || user?.email_verified);
  const sub = dashboard?.subscription;
  const usage = sub?.usage;
  const wallet = dashboard?.wallet;
  const history = dashboard?.morph.history ?? [];
  const photoCount = dashboard?.morph.photo_count ?? 0;
  const plan = planLabel(sub);
  const days = sub?.days_remaining;
  const aiUsed = usage?.morph_ai_used ?? 0;
  const aiLimit = usage?.morph_ai_limit ?? 0;
  const aiRemain = usage?.morph_ai_remaining ?? 0;
  const progress = aiLimit > 0 ? Math.min(1, aiUsed / aiLimit) : 0;
  const badge = (sub?.badge || "").toLowerCase();
  const checkColor = badge === "pro" ? GOLD : "#5AC8FA";

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_DOCK_CLEARANCE + Math.max(insets.bottom, 16) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!dashboard}
            onRefresh={refresh}
            tintColor="#FFF"
          />
        }
      >
        <View style={styles.topRow}>
          <Image source={morfWordmarkWhite} style={styles.wordmark} contentFit="contain" />
          <View style={styles.topActions}>
            {unreadCount > 0 ? (
              <Pressable
                onPress={() => navigation.navigate("Notifications")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Bildirishnomalar"
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Ionicons name="notifications-outline" size={18} color="#FFF" />
                <View style={styles.badgeDot}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Sozlamalar"
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <Ionicons name="settings-outline" size={18} color="#FFF" />
            </Pressable>
          </View>
        </View>

        {error ? (
          <Pressable
            onPress={refresh}
            style={({ pressed }) => [styles.errorBanner, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="warning-outline" size={16} color="#FFB4A8" />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>Qayta</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate("PersonalInfo")}
          style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Shaxsiy ma'lumot"
        >
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#2C2C30", "#121214"]} style={styles.avatar}>
                {loading && !dashboard ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.avatarText}>{initials(display)}</Text>
                )}
              </LinearGradient>
            )}
            {verified ? (
              <View style={[styles.checkBadge, { backgroundColor: checkColor }]}>
                <Ionicons name="checkmark" size={11} color="#0A0A0A" />
              </View>
            ) : null}
          </View>

          <View style={styles.identityBody}>
            <Text style={styles.name} numberOfLines={1}>
              {display}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaPlan, sub?.has_active && styles.metaPlanOn]} numberOfLines={1}>
                {plan}
              </Text>
              {sub?.has_active && days != null ? (
                <Text style={styles.metaDays}>{days} kun</Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={MUTED} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("MorphPaywall")}
          style={({ pressed }) => [styles.usageCard, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={["rgba(212,175,55,0.16)", "rgba(255,255,255,0.04)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.usageInner}
          >
            <View style={styles.usageTop}>
              <View>
                <Text style={styles.usageEyebrow}>Morph AI</Text>
                <Text style={styles.usageTitle}>
                  {sub?.has_active
                    ? aiLimit > 0
                      ? `${aiRemain} generatsiya qoldi`
                      : plan
                    : "Tarifni oching"}
                </Text>
              </View>
              <Text style={styles.usageCta}>{sub?.has_active ? "Boshqarish" : "Sotib olish"}</Text>
            </View>

            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>

            <Text style={styles.usageHint}>
              {aiLimit > 0
                ? `${aiUsed} / ${aiLimit} AI · Studio ${usage?.morph_studio_used ?? 0}/${usage?.morph_studio_limit ?? 0}`
                : "Try-on va Studio limitlari obuna bilan ochiladi"}
              {sub?.morph_care ? " · Parvarish yoqilgan" : ""}
            </Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <QuickTile
              icon="images-outline"
              label="Looks"
              value={String(photoCount)}
              onPress={() => openMorphStack(navigation, "MorphHistory")}
            />
            <QuickTile
              icon="wallet-outline"
              label="Hamyon"
              value={formatSom(wallet?.balance ?? 0).replace(" so'm", "")}
              onPress={() => navigation.navigate("WalletGate")}
            />
          </View>
          <View style={styles.gridRow}>
            <QuickTile
              icon="settings-outline"
              label="Sozlamalar"
              value="Hisob"
              onPress={() => navigation.navigate("Settings")}
            />
            <QuickTile
              icon="sparkles-outline"
              label="Studio"
              value="AI"
              onPress={() => openMorphStack(navigation, "MorphStudio")}
            />
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>So‘nggi looks</Text>
          <Pressable onPress={() => openMorphStack(navigation, "MorphHistory")} hitSlop={8}>
            <Text style={styles.link}>Hammasi</Text>
          </Pressable>
        </View>

        {history.length === 0 ? (
          <Pressable
            style={({ pressed }) => [styles.emptyHistory, pressed && styles.pressed]}
            onPress={() => openMorphStack(navigation, "MorphCapture")}
            accessibilityRole="button"
          >
            <View style={styles.emptyIcon}>
              <Ionicons name="camera-outline" size={22} color="#FFF" />
            </View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>Birinchi try-on</Text>
              <Text style={styles.emptySub}>Natijalar shu yerda saqlanadi</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyRow}
          >
            {history.map((item) => {
              const uri = resolveMediaUrl(item.after_url || item.before_url, { width: 280 });
              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    openMorphStack(navigation, "MorphHistory", { generationId: item.id })
                  }
                  style={({ pressed }) => [styles.thumb, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumbImg, styles.thumbFallback]} />
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.75)"]}
                    style={styles.thumbScrim}
                  />
                  <Text style={styles.thumbTitle} numberOfLines={1}>
                    {item.title || "Look"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.menu}>
          <MenuRow
            icon="notifications-outline"
            title="Bildirishnomalar"
            badge={unreadCount}
            onPress={() => navigation.navigate("Notifications")}
          />
          <MenuRow
            icon="shield-checkmark-outline"
            title="Xavfsizlik"
            onPress={() => navigation.navigate("Security")}
            last
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          onPress={() => void signOut()}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={18} color="#FFF" />
          <Text style={styles.logoutText}>Chiqish</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function QuickTile({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={16} color="#FFF" />
      </View>
      <Text style={styles.tileValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

function MenuRow({
  icon,
  title,
  badge,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  badge?: number;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, !last && styles.menuBorder, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={17} color="#FFF" />
      </View>
      <Text style={styles.menuTitle}>{title}</Text>
      {badge && badge > 0 ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 16 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  wordmark: { width: 112, height: 26 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDot: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 9, fontWeight: "800", color: "#111" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,100,80,0.14)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: "#FFD0C8", fontWeight: "600" },
  errorRetry: { fontSize: 13, fontWeight: "800", color: "#FFF" },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
    padding: 12,
    marginBottom: 12,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 64, height: 64, borderRadius: 20 },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#FFF" },
  checkBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BG,
  },
  identityBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: "800", color: "#FFF", letterSpacing: -0.3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  metaPlan: { fontSize: 12, fontWeight: "700", color: MUTED },
  metaPlanOn: { color: GOLD },
  metaDays: { fontSize: 12, fontWeight: "600", color: MUTED },
  usageCard: { marginBottom: 12, borderRadius: 18, overflow: "hidden" },
  usageInner: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212,175,55,0.28)",
    padding: 16,
  },
  usageTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  usageEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: GOLD,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  usageTitle: { fontSize: 17, fontWeight: "800", color: "#FFF", letterSpacing: -0.3 },
  usageCta: { fontSize: 13, fontWeight: "700", color: GOLD, marginTop: 2 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  trackFill: { height: "100%", backgroundColor: GOLD, borderRadius: 3 },
  usageHint: { marginTop: 10, fontSize: 12, lineHeight: 17, color: MUTED },
  grid: { gap: 10, marginBottom: 18 },
  gridRow: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: SURFACE_STRONG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileValue: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  tileLabel: { fontSize: 12, fontWeight: "600", color: MUTED },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  link: { fontSize: 13, fontWeight: "700", color: GOLD },
  emptyHistory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
    padding: 14,
    marginBottom: 14,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SURFACE_STRONG,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  emptySub: { marginTop: 2, fontSize: 12, color: MUTED },
  historyRow: { gap: 10, paddingBottom: 14 },
  thumb: { width: 112, height: 140, borderRadius: 16, overflow: "hidden" },
  thumbImg: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  thumbFallback: { backgroundColor: "#1A1A1C" },
  thumbScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 52 },
  thumbTitle: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  menu: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: SURFACE_STRONG,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#FFF" },
  menuBadge: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBadgeText: { fontSize: 11, fontWeight: "800", color: "#111" },
  logout: {
    marginTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
    borderRadius: 14,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  pressed: { opacity: 0.82 },
});
