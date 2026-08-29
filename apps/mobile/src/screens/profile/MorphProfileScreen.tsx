import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Platform,
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
import { morfWordmark, morfWordmarkWhite } from "../../branding/morf-logo";
import { useProfileDashboard } from "../../hooks/useProfileDashboard";
import { TAB_DOCK_CLEARANCE } from "../../hooks/useHideTabBar";
import { UsageRing } from "../../components/morph/UsageMeter";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { useAppShell } from "../../lib/AppShellContext";
import { openMorphStack } from "../../lib/profile-nav";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { morphFont } from "../../theme/morph-font";
import type { MorphPalette } from "../../theme/morph-appearance";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

export function MorphProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { signOut, user: authUser } = useAuth();
  const { dashboard, unreadCount, loading, error, refresh } = useProfileDashboard();
  const { colors: pal, fs, theme } = useMorphAppearance();
  const { setShell, rememberTab } = useAppShell();

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
  const usagePct = Math.round(progress * 100);
  const meterColor =
    usagePct >= 90 ? pal.destructive : usagePct >= 70 ? pal.warn : pal.accent;
  const styles = makeStyles(pal, fs);

  const openSettings = () => navigation.navigate("MorphAiSettings");

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <StatusBar style={pal.status} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        bounces
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_DOCK_CLEARANCE + Math.max(insets.bottom, 16) + 60 },
        ]}
        // RN-web: RefreshControl ScrollView style’ni o‘ziga ko‘chirib ikki nested
        // overflow:auto hosil qiladi — vertikal scroll ishlamaydi.
        refreshControl={
          Platform.OS === "web" ? undefined : (
            <RefreshControl
              refreshing={loading && !!dashboard}
              onRefresh={refresh}
              tintColor={pal.fg}
            />
          )
        }
      >
        <View style={styles.topRow}>
          <Image
            source={theme === "dark" ? morfWordmarkWhite : morfWordmark}
            style={styles.wordmark}
            contentFit="contain"
          />
        </View>

        {error ? (
          <Pressable
            onPress={refresh}
            style={({ pressed }) => [styles.errorBanner, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="alert-circle-outline" size={16} color={pal.destructive} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>Qayta</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={openSettings}
          style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Sozlamalar"
        >
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#2A9B8F", "#1D6F68"]} style={styles.avatar}>
                {loading && !dashboard ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.avatarText}>{initials(display)}</Text>
                )}
              </LinearGradient>
            )}
            {verified ? (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={11} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.name} numberOfLines={1}>
              {display}
            </Text>
            <Text style={styles.metaPlan} numberOfLines={1}>
              {sub?.has_active && days != null ? `${plan} · ${days} kun` : plan}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={pal.muted} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("MorphPaywall")}
          style={({ pressed }) => [styles.usageCard, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <View style={styles.usageTop}>
            <View style={styles.usageCopy}>
              <Text style={styles.usageEyebrow}>Morph AI</Text>
              <Text style={styles.usageTitle}>
                {sub?.has_active
                  ? aiLimit > 0
                    ? `${aiRemain} generatsiya qoldi`
                    : plan
                  : "Tarifni oching"}
              </Text>
              <Text style={styles.usageHint}>
                {aiLimit > 0
                  ? `${aiUsed} / ${aiLimit} AI · Studio ${usage?.morph_studio_used ?? 0}/${usage?.morph_studio_limit ?? 0}`
                  : "Try-on va Studio limitlari obuna bilan ochiladi"}
              </Text>
            </View>
            <UsageRing pct={usagePct} color={meterColor} size={64} stroke={6}>
              <Text style={[styles.usagePct, { color: meterColor, fontSize: fs(12) }]}>
                {usagePct}%
              </Text>
            </UsageRing>
          </View>
          <View style={styles.usageBottom}>
            <Text style={styles.usageCta}>{sub?.has_active ? "Boshqarish" : "Sotib olish"}</Text>
          </View>
        </Pressable>

        <View style={styles.menu}>
          <MenuRow
            pal={pal}
            styles={styles}
            icon="settings"
            title="Sozlamalar"
            subtitle="Ko'rinish, limit, maxfiylik"
            onPress={openSettings}
          />
          <MenuRow
            pal={pal}
            styles={styles}
            icon="images"
            title="Looks"
            value={String(photoCount)}
            onPress={() => openMorphStack(navigation, "MorphHistory")}
          />
          <MenuRow
            pal={pal}
            styles={styles}
            icon="color-wand"
            title="Studio"
            onPress={() => openMorphStack(navigation, "MorphStudio")}
          />
          <MenuRow
            pal={pal}
            styles={styles}
            icon="wallet"
            title="Hamyon"
            value={formatSom(wallet?.balance ?? 0).replace(" so'm", "")}
            onPress={() => {
              setShell("morph");
              rememberTab("morph", "Profile");
              navigation.navigate("WalletGate");
            }}
            last
          />
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
              <Ionicons name="camera-outline" size={20} color={pal.fg} />
            </View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>Birinchi try-on</Text>
              <Text style={styles.emptySub}>Natijalar shu yerda saqlanadi</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={pal.muted} />
          </Pressable>
        ) : (
          <ScrollView
            horizontal
            style={styles.historyScroll}
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            directionalLockEnabled
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
                    colors={["transparent", "rgba(0,0,0,0.72)"]}
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

        <View style={[styles.menu, { marginTop: 4 }]}>
          <MenuRow
            pal={pal}
            styles={styles}
            icon="notifications"
            title="Bildirishnomalar"
            badge={unreadCount}
            onPress={() => navigation.navigate("Notifications")}
          />
          <MenuRow
            pal={pal}
            styles={styles}
            icon="lock-closed"
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
          <Ionicons name="log-out-outline" size={18} color={pal.destructive} />
          <Text style={styles.logoutText}>Chiqish</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function MenuRow({
  pal,
  styles,
  icon,
  title,
  subtitle,
  value,
  badge,
  onPress,
  last,
}: {
  pal: MorphPalette;
  styles: ReturnType<typeof makeStyles>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: string;
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
        <Ionicons name={icon} size={18} color={pal.fg} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      {badge && badge > 0 ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={pal.muted} />
    </Pressable>
  );
}

function makeStyles(pal: MorphPalette, fs: (n: number) => number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: pal.bg },
    scroll: { flex: 1, minHeight: 0 },
    content: { paddingHorizontal: scale(16), flexGrow: 0 },
    historyScroll: { flexGrow: 0 },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(12),
    },
    wordmark: { width: scale(104), height: verticalScale(24) },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateScale(8),
      backgroundColor: "rgba(255, 69, 58, 0.14)",
      borderRadius: moderateScale(14),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(10),
      marginBottom: verticalScale(10),
    },
    errorText: {
      flex: 1,
      ...morphFont,
      fontSize: fs(13),
      color: pal.destructive,
      fontWeight: "600",
    },
    errorRetry: { ...morphFont, fontSize: fs(13), fontWeight: "700", color: pal.accent },
    identity: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateScale(12),
      backgroundColor: pal.card,
      borderRadius: moderateScale(20),
      padding: moderateScale(13),
      marginBottom: verticalScale(10),
      borderWidth: 1,
      borderColor: pal.line,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: pal.theme === "dark" ? 0.2 : 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    avatarWrap: { position: "relative" },
    avatar: {
      width: scale(52),
      height: scale(52),
      borderRadius: moderateScale(26),
      alignItems: "center",
      justifyContent: "center",
    },
    avatarImg: { width: scale(52), height: scale(52), borderRadius: moderateScale(26) },
    avatarText: { ...morphFont, fontSize: fs(17), fontWeight: "700", color: "#FFFFFF" },
    checkBadge: {
      position: "absolute",
      right: -1,
      bottom: -1,
      width: scale(18),
      height: scale(18),
      borderRadius: moderateScale(9),
      backgroundColor: pal.accent,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: pal.card,
    },
    identityBody: { flex: 1, minWidth: 0 },
    name: {
      ...morphFont,
      fontSize: fs(16),
      fontWeight: "700",
      color: pal.fg,
      letterSpacing: -0.4,
    },
    metaPlan: { marginTop: verticalScale(2), ...morphFont, fontSize: fs(12), color: pal.muted },
    usageCard: {
      backgroundColor: pal.card,
      borderRadius: moderateScale(20),
      padding: moderateScale(14),
      marginBottom: verticalScale(12),
      borderWidth: 1,
      borderColor: pal.theme === "dark" ? "rgba(17, 17, 17, 0.12)" : "rgba(17, 17, 17, 0.12)",
      shadowColor: "#8B5CF6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: pal.theme === "dark" ? 0.16 : 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    usageTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: moderateScale(10),
      marginBottom: verticalScale(8),
    },
    usageCopy: { flex: 1, minWidth: 0 },
    usageEyebrow: {
      ...morphFont,
      fontSize: fs(10.5),
      fontWeight: "600",
      color: pal.accent,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: verticalScale(3),
    },
    usageTitle: {
      ...morphFont,
      fontSize: fs(15),
      fontWeight: "600",
      color: pal.fg,
      letterSpacing: -0.3,
    },
    usagePctWrap: { alignItems: "flex-end" },
    usagePct: { ...morphFont, fontSize: fs(20), fontWeight: "600", letterSpacing: -0.6 },
    track: {
      height: verticalScale(7),
      borderRadius: moderateScale(3.5),
      backgroundColor: pal.track,
      overflow: "hidden",
    },
    trackFill: { height: "100%", borderRadius: moderateScale(3.5) },
    usageBottom: {
      marginTop: verticalScale(8),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: moderateScale(10),
    },
    usageHint: { flex: 1, ...morphFont, fontSize: fs(11.5), lineHeight: fs(15), color: pal.muted },
    usageCta: { ...morphFont, fontSize: fs(12.5), fontWeight: "600", color: pal.accent },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: verticalScale(6),
      marginTop: verticalScale(4),
      paddingHorizontal: scale(4),
    },
    sectionTitle: { ...morphFont, fontSize: fs(12.5), fontWeight: "500", color: pal.muted },
    link: { ...morphFont, fontSize: fs(12.5), fontWeight: "600", color: pal.accent },
    emptyHistory: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateScale(10),
      backgroundColor: pal.card,
      borderRadius: moderateScale(16),
      padding: moderateScale(12),
      marginBottom: verticalScale(12),
    },
    emptyIcon: {
      width: scale(36),
      height: scale(36),
      borderRadius: moderateScale(10),
      backgroundColor: pal.iconTile,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyCopy: { flex: 1 },
    emptyTitle: { ...morphFont, fontSize: fs(14), fontWeight: "600", color: pal.fg },
    emptySub: { marginTop: 1, ...morphFont, fontSize: fs(11.5), color: pal.muted },
    historyRow: { gap: moderateScale(8), paddingBottom: verticalScale(10) },
    thumb: { width: scale(96), height: verticalScale(120), borderRadius: moderateScale(14), overflow: "hidden" },
    thumbImg: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    thumbFallback: { backgroundColor: pal.iconTile },
    thumbScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: verticalScale(44) },
    thumbTitle: {
      position: "absolute",
      left: scale(6),
      right: scale(6),
      bottom: verticalScale(6),
      ...morphFont,
      fontSize: fs(10.5),
      fontWeight: "600",
      color: "#FFFFFF",
    },
    menu: {
      backgroundColor: pal.card,
      borderRadius: moderateScale(20),
      overflow: "hidden",
      marginBottom: verticalScale(12),
      borderWidth: 1,
      borderColor: pal.line,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: pal.theme === "dark" ? 0.15 : 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateScale(12),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(12),
      minHeight: verticalScale(48),
    },
    menuBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pal.line },
    menuIcon: {
      width: scale(32),
      height: scale(32),
      borderRadius: moderateScale(10),
      backgroundColor: pal.iconTile,
      alignItems: "center",
      justifyContent: "center",
    },
    menuCopy: { flex: 1, minWidth: 0 },
    menuTitle: { ...morphFont, fontSize: fs(14), fontWeight: "500", color: pal.fg },
    menuSub: { marginTop: 1, ...morphFont, fontSize: fs(11.5), color: pal.muted },
    menuValue: { ...morphFont, fontSize: fs(13), color: pal.muted, marginRight: scale(2) },
    menuBadge: {
      minWidth: scale(20),
      height: verticalScale(18),
      borderRadius: moderateScale(9),
      paddingHorizontal: scale(5),
      backgroundColor: pal.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    menuBadgeText: { ...morphFont, fontSize: fontSize(10.5), fontWeight: "700", color: "#FFFFFF" },
    logout: {
      marginTop: verticalScale(2),
      minHeight: verticalScale(46),
      borderRadius: moderateScale(16),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateScale(8),
      backgroundColor: pal.card,
      borderWidth: 1,
      borderColor: pal.line,
    },
    logoutText: { ...morphFont, fontSize: fs(13.5), fontWeight: "500", color: pal.destructive },
    pressed: { opacity: 0.72 },
  });
}
