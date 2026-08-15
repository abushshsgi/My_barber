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
import { openMorphStack } from "../../lib/profile-nav";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

const BG = "#070708";
const CARD = "rgba(255,255,255,0.06)";
const LINE = "rgba(255,255,255,0.08)";
const MUTED = "rgba(255,255,255,0.55)";

export function MorphProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { signOut, user: authUser } = useAuth();
  const { dashboard, loading, refresh } = useProfileDashboard();

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
  const checkColor = badge === "pro" ? "#F5C542" : "#5AC8FA";

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            hitSlop={10}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="settings-outline" size={20} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#2A2A2E", "#141416"]} style={styles.avatar}>
                {loading && !dashboard ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.avatarText}>{initials(display)}</Text>
                )}
              </LinearGradient>
            )}
            {verified ? (
              <View style={[styles.checkBadge, { backgroundColor: checkColor }]}>
                <Ionicons name="checkmark" size={12} color="#0A0A0A" />
              </View>
            ) : null}
          </View>

          <Pressable
            style={styles.nameRow}
            onPress={() => navigation.navigate("PersonalInfo")}
          >
            <Text style={styles.name}>{display}</Text>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>

          <View style={styles.planRow}>
            <View style={[styles.planPill, sub?.has_active && styles.planPillOn]}>
              <Ionicons
                name={sub?.has_active ? "diamond" : "diamond-outline"}
                size={12}
                color={sub?.has_active ? "#F5C542" : MUTED}
              />
              <Text style={[styles.planText, sub?.has_active && styles.planTextOn]}>
                {plan}
              </Text>
            </View>
            {sub?.has_active && days != null ? (
              <Text style={styles.days}>{days} kun qoldi</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCell
            label="Rasmlar"
            value={String(photoCount)}
            onPress={() => openMorphStack(navigation, "MorphHistory")}
          />
          <View style={styles.statDivider} />
          <StatCell
            label="Hamyon"
            value={formatSom(wallet?.balance ?? 0).replace(" so'm", "")}
            hint="so‘m"
            onPress={() => navigation.navigate("WalletGate")}
          />
          <View style={styles.statDivider} />
          <StatCell
            label="AI limit"
            value={aiLimit > 0 ? `${aiRemain}` : "—"}
            hint={aiLimit > 0 ? `/ ${aiLimit}` : "obuna"}
            onPress={() => navigation.navigate("MorphPaywall")}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => navigation.navigate("MorphPaywall")}
        >
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Obuna tarifi</Text>
            <Text style={styles.cardLink}>{sub?.has_active ? "Boshqarish" : "Sotib olish"}</Text>
          </View>
          <Text style={styles.cardLead}>
            {sub?.has_active
              ? `${plan} — bu oy ${aiUsed} / ${aiLimit} Morph AI`
              : "Morph AI try-on uchun tarif tanlang"}
          </Text>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.cardHint}>
            Studio: {usage?.morph_studio_used ?? 0} / {usage?.morph_studio_limit ?? 0}
            {sub?.morph_care ? " · Parvarish yoqilgan" : ""}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => navigation.navigate("Referrals")}
        >
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Do&apos;stlarni taklif</Text>
            <Text style={styles.cardLink}>Ochish</Text>
          </View>
          <Text style={styles.cardLead}>
            {sub?.referral_generation_enabled === false
              ? "Do'stlaringizni MySaloon ga taklif qiling"
              : "1 referal = 1 generatsiya krediti"}
          </Text>
          <Text style={styles.cardHint}>
            {sub?.referral_generation_enabled === false
              ? "Kodingizni ulashing"
              : "Yoki obuna bilan ishlang — ikkalasi ham ochadi"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => navigation.navigate("WalletHome")}
        >
          <View style={styles.cardHead}>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet-outline" size={18} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>Hamyon</Text>
            <Text style={styles.cardLink}>To‘ldirish</Text>
          </View>
          <Text style={styles.balance}>{formatSom(wallet?.balance ?? 0)}</Text>
          {wallet?.wallet_number ? (
            <Text style={styles.cardHint}>{wallet.wallet_number}</Text>
          ) : null}
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tarix</Text>
          <Pressable onPress={() => openMorphStack(navigation, "MorphHistory")} hitSlop={8}>
            <Text style={styles.cardLink}>Hammasi</Text>
          </Pressable>
        </View>

        {history.length === 0 ? (
          <Pressable
            style={({ pressed }) => [styles.emptyHistory, pressed && styles.pressed]}
            onPress={() => openMorphStack(navigation, "MorphCapture")}
          >
            <Ionicons name="images-outline" size={28} color={MUTED} />
            <Text style={styles.emptyTitle}>Hali rasm yo‘q</Text>
            <Text style={styles.emptySub}>Try-on qiling — natijalar shu yerda saqlanadi</Text>
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
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumbImg, styles.thumbFallback]} />
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)"]}
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
            icon="sparkles-outline"
            title="AI Studio"
            subtitle="Lookni tahrirlash"
            onPress={() => openMorphStack(navigation, "MorphStudio")}
          />
          <MenuRow
            icon="person-outline"
            title="Shaxsiy ma’lumot"
            subtitle="Ism, telefon, email"
            onPress={() => navigation.navigate("PersonalInfo")}
          />
          <MenuRow
            icon="notifications-outline"
            title="Bildirishnomalar"
            onPress={() => navigation.navigate("Notifications")}
          />
          <MenuRow
            icon="shield-checkmark-outline"
            title="Xavfsizlik"
            onPress={() => navigation.navigate("Security")}
            last
          />
        </View>

        <Pressable style={({ pressed }) => [styles.logout, pressed && styles.pressed]} onPress={() => void signOut()}>
          <Ionicons name="log-out-outline" size={18} color="#FFF" />
          <Text style={styles.logoutText}>Chiqish</Text>
        </Pressable>

        <Text style={styles.foot}>
          Shu akkaunt MySaloon bronlari va Morf AI uchun bir xil
        </Text>
      </ScrollView>
    </View>
  );
}

function StatCell({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.statCell, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
        {hint ? <Text style={styles.statHint}> {hint}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, !last && styles.menuBorder, pressed && styles.pressed]}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={18} color="#FFF" />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 16, paddingBottom: 36 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  wordmark: { width: 118, height: 28 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { alignItems: "center", marginBottom: 22 },
  avatarWrap: { marginBottom: 12 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 92, height: 92, borderRadius: 46 },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  checkBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BG,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { fontSize: 22, fontWeight: "800", color: "#FFF", letterSpacing: -0.4 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  planPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CARD,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planPillOn: { backgroundColor: "rgba(245,197,66,0.14)" },
  planText: { fontSize: 12, fontWeight: "700", color: MUTED },
  planTextOn: { color: "#F5C542" },
  days: { fontSize: 12, fontWeight: "600", color: MUTED },
  statsRow: {
    flexDirection: "row",
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: 14,
    marginBottom: 12,
  },
  statCell: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 6 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: LINE },
  statValue: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  statHint: { fontSize: 11, fontWeight: "600", color: MUTED },
  statLabel: { fontSize: 11, fontWeight: "600", color: MUTED },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#FFF" },
  cardLink: { fontSize: 13, fontWeight: "700", color: "#F5C542" },
  cardLead: { fontSize: 13, color: MUTED, marginBottom: 10 },
  cardHint: { marginTop: 8, fontSize: 12, color: MUTED },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  trackFill: { height: "100%", backgroundColor: "#F5C542", borderRadius: 3 },
  walletIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  balance: { fontSize: 22, fontWeight: "800", color: "#FFF", letterSpacing: -0.4 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  emptyHistory: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: 28,
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#FFF", marginTop: 6 },
  emptySub: { fontSize: 12, color: MUTED, textAlign: "center", paddingHorizontal: 24 },
  historyRow: { gap: 10, paddingBottom: 12 },
  thumb: { width: 118, height: 148, borderRadius: 14, overflow: "hidden" },
  thumbImg: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  thumbFallback: { backgroundColor: "#1A1A1C" },
  thumbScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 48 },
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
    backgroundColor: CARD,
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 4,
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
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  menuSub: { marginTop: 2, fontSize: 12, color: MUTED },
  logout: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 14,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  foot: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    color: MUTED,
    paddingHorizontal: 12,
  },
  pressed: { opacity: 0.82 },
});
