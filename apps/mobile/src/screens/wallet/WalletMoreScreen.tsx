import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useShellTheme, type ShellTheme } from "../../lib/useShellTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletMore">;

type GridItem = {
  key: keyof WalletStackParamList;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function buildGrid(t: (key: string) => string): GridItem[] {
  return [
    { key: "WalletTopUp", title: t("walletPages.topUp"), subtitle: t("walletPages.topUpSub"), icon: "add-outline" },
    { key: "WalletGift", title: t("walletPages.transfer"), subtitle: t("walletPages.transferSub"), icon: "send-outline" },
    { key: "WalletGifts", title: t("walletPages.receivedGifts"), subtitle: t("walletPages.incomingGifts"), icon: "gift-outline" },
    { key: "WalletTransactions", title: t("walletPages.historyTitle"), subtitle: t("walletPages.historySub"), icon: "time-outline" },
    { key: "WalletRequisites", title: t("walletPages.myCard"), subtitle: t("walletPages.requisites"), icon: "card-outline" },
    { key: "WalletFreeze", title: t("walletPages.freezeCard"), subtitle: t("walletPages.security"), icon: "snow-outline" },
    { key: "WalletFaq", title: t("walletPages.faqTitle"), subtitle: t("walletPages.faqSub"), icon: "help-circle-outline" },
    { key: "WalletQrPay", title: t("walletPages.qrPay"), subtitle: t("walletPages.qrSub"), icon: "qr-code-outline" },
  ];
}

/** Ko'proq — bonus banner (tez orada) + monoxrom grid. */
export function WalletMoreScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const pal = useShellTheme();
  const styles = useMemo(
    () => createMoreStyles(pal),
    [pal.bg, pal.fg, pal.muted, pal.card, pal.iconTile, pal.status],
  );
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const me = useWalletMe();
  const grid = useMemo(() => buildGrid(t), [t]);

  useFocusEffect(
    useCallback(() => {
      me.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [me.refresh]),
  );

  return (
    <View style={[styles.root, { paddingTop: safeTop(insets.top, 8), paddingBottom: safeBottom(insets.bottom, 0) }]}>
      <View style={styles.header}>
        <NativeBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{t("walletPages.moreTitle")}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.bonusWrap} pointerEvents="none">
          <View style={styles.bonusCard}>
            <View style={styles.bonusIcon}>
              <Ionicons name="sparkles-outline" size={22} color={pal.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bonusTitle}>{t("walletPages.bonuses")}</Text>
              <Text style={styles.bonusSub}>{t("walletPages.bonusSoon")}</Text>
            </View>
            <View style={styles.soonPill}>
              <Text style={styles.soonText}>{t("profile.soon")}</Text>
            </View>
          </View>
          <View style={styles.bonusBlur} />
        </View>

        {me.isFrozen ? (
          <Pressable
            style={styles.frozenBanner}
            onPress={() => navigation.navigate("WalletFreeze", { isFrozen: true })}
          >
            <Ionicons name="snow-outline" size={18} color={pal.fg} />
            <Text style={styles.frozenText}>{t("walletPages.frozenManage")}</Text>
            <Ionicons name="chevron-forward" size={16} color={pal.muted} />
          </Pressable>
        ) : null}

        <Text style={styles.section}>{t("walletPages.actions")}</Text>
        <View style={styles.grid}>
          {grid.map((item) => {
            const isFreeze = item.key === "WalletFreeze";
            const title = isFreeze
              ? me.isFrozen
                ? t("walletPages.unfreezeCard")
                : t("walletPages.freezeCard")
              : item.title;
            const subtitle = isFreeze
              ? me.isFrozen
                ? t("walletPages.reactivate")
                : item.subtitle
              : item.subtitle;
            return (
              <Pressable
                key={item.key}
                style={styles.tile}
                onPress={() => {
                  if (isFreeze) {
                    navigation.navigate("WalletFreeze", { isFrozen: me.isFrozen });
                    return;
                  }
                  navigation.navigate(item.key as never);
                }}
              >
                <View style={styles.tileIcon}>
                  <Ionicons name={item.icon} size={22} color={pal.fg} />
                </View>
                <Text style={styles.tileTitle} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={styles.tileSub} numberOfLines={1}>
                  {subtitle}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function createMoreStyles(pal: ShellTheme) {
  const overlay = pal.status === "light" ? "rgba(10,10,10,0.45)" : "rgba(250,250,250,0.55)";
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: pal.bg, paddingHorizontal: scale(16) },
  header: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(14) },
  iconBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: pal.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize(17),
    fontWeight: "800",
    color: pal.fg,
  },
  scroll: { paddingBottom: verticalScale(28) },
  bonusWrap: {
    position: "relative",
    marginBottom: verticalScale(16),
    borderRadius: moderateScale(22),
    overflow: "hidden",
  },
  bonusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: pal.card,
    borderRadius: moderateScale(22),
    padding: moderateScale(16),
  },
  bonusIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(14),
    backgroundColor: pal.iconTile,
    alignItems: "center",
    justifyContent: "center",
  },
  bonusTitle: { fontSize: fontSize(16), fontWeight: "800", color: pal.fg },
  bonusSub: { marginTop: verticalScale(2), fontSize: fontSize(12), color: pal.muted },
  soonPill: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: pal.iconTile,
  },
  soonText: { fontSize: fontSize(11), fontWeight: "700", color: pal.muted },
  bonusBlur: {
    ...StyleSheet.absoluteFill,
    backgroundColor: overlay,
  },
  frozenBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    backgroundColor: pal.iconTile,
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(16),
  },
  frozenText: { flex: 1, fontSize: fontSize(13), fontWeight: "700", color: pal.fg },
  section: {
    marginBottom: verticalScale(12),
    fontSize: fontSize(12),
    fontWeight: "700",
    color: pal.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(12) },
  tile: {
    width: "47.5%",
    flexGrow: 1,
    minWidth: "45%",
    backgroundColor: pal.card,
    borderRadius: moderateScale(20),
    padding: moderateScale(14),
    gap: moderateScale(4),
  },
  tileIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(13),
    backgroundColor: pal.iconTile,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(6),
  },
  tileTitle: { fontSize: fontSize(14), fontWeight: "800", color: pal.fg, letterSpacing: -0.2 },
  tileSub: { fontSize: fontSize(11), color: pal.muted, fontWeight: "500" },
  });
}
