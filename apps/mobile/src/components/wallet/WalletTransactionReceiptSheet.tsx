import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useCallback, useMemo, useState } from "react";
import { useShellTheme, type ShellTheme } from "../../lib/useShellTheme";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeModal } from "../ui/SafeModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { formatSomLabel, type WalletTx } from "../../lib/wallet-format";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = {
  tx: WalletTx | null;
  visible: boolean;
  onClose: () => void;
};

function useReceiptChrome() {
  const pal = useShellTheme();
  const styles = useMemo(
    () => createReceiptStyles(pal),
    [pal.bg, pal.fg, pal.muted, pal.card, pal.border, pal.iconTile, pal.onAccent],
  );
  return { pal, styles };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { styles } = useReceiptChrome();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function WalletTransactionReceiptSheet({ tx, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { pal, styles } = useReceiptChrome();
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    if (!tx?.id) return;
    try {
      await Clipboard.setStringAsync(tx.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }, [tx?.id]);

  if (!tx) return null;

  const signed =
    tx.kind === "in"
      ? `+${formatSomLabel(Math.abs(tx.amount))}`
      : `−${formatSomLabel(Math.abs(tx.amount))}`;
  const direction = tx.kind === "in" ? "Kirim" : "Chiqim";
  const party =
    Boolean(tx.senderName || tx.recipientName || tx.senderWalletMasked || tx.recipientWalletMasked) ||
    tx.entryType === "gift_in" ||
    tx.entryType === "gift_out" ||
    tx.entryType === "qr_pay" ||
    tx.entryType === "booking_pay";

  return (
    <SafeModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: safeBottom(insets.bottom, 8) }]}>
        <View style={styles.handle} />
        <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={18} color={pal.muted} />
        </Pressable>

        <Text style={styles.title}>Tranzaksiya cheki</Text>
        <Text style={styles.lead}>Hamyon yozuvi. Yordam uchun ID ni nusxalang.</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "78%" }}>
          <View style={styles.card}>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <Ionicons
                    name={tx.kind === "in" ? "arrow-down-outline" : "arrow-up-outline"}
                    size={18}
                    color={pal.onAccent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {tx.title}
                  </Text>
                  <Text style={styles.heroMeta}>
                    {direction} · {tx.date}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroAmt}>{signed}</Text>
            </View>

            <View style={styles.details}>
              {party ? (
                <>
                  {tx.senderName ? <DetailRow label="Yuboruvchi" value={tx.senderName} /> : null}
                  {tx.senderWalletMasked ? (
                    <DetailRow label="Yuboruvchi hamyon" value={tx.senderWalletMasked} />
                  ) : null}
                  {tx.recipientName ? <DetailRow label="Oluvchi" value={tx.recipientName} /> : null}
                  {tx.recipientWalletMasked ? (
                    <DetailRow label="Oluvchi hamyon" value={tx.recipientWalletMasked} />
                  ) : null}
                </>
              ) : null}

              {tx.message ? (
                <View style={styles.msgBlock}>
                  <Text style={styles.rowLabel}>Xabar</Text>
                  <Text style={styles.msg}>“{tx.message}”</Text>
                </View>
              ) : null}

              <DetailRow label="Yo'nalish" value={direction} />
              <DetailRow label="Summa" value={formatSomLabel(Math.abs(tx.amount))} />
              <DetailRow label="Sana" value={tx.date} />
            </View>
          </View>

          <Text style={styles.helpHead}>Yordam uchun</Text>
          <Pressable style={styles.idBox} onPress={() => void onCopy()}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Yozuv ID</Text>
              <Text style={styles.idValue}>{tx.id}</Text>
            </View>
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={18}
              color={copied ? "#16A34A" : pal.muted}
            />
          </Pressable>
          <Text style={styles.helpNote}>
            Supportga yozganda Yozuv ID ni yuboring.
          </Text>
        </ScrollView>
      </View>
    </SafeModal>
  );
}

function createReceiptStyles(pal: ShellTheme) {
  return StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "92%",
    backgroundColor: pal.card,
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
  },
  handle: {
    alignSelf: "center",
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: pal.border,
    marginBottom: verticalScale(12),
  },
  close: {
    position: "absolute",
    right: scale(16),
    top: verticalScale(14),
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    backgroundColor: pal.iconTile,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  title: { fontSize: fontSize(17), fontWeight: "800", color: pal.fg },
  lead: { marginTop: verticalScale(4), fontSize: fontSize(12), color: pal.muted, marginBottom: verticalScale(14) },
  card: {
    borderRadius: moderateScale(24),
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: pal.border,
  },
  hero: {
    backgroundColor: pal.fg,
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(18),
    paddingBottom: verticalScale(22),
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: moderateScale(12) },
  heroIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(14),
    backgroundColor: pal.iconTile,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: fontSize(14), fontWeight: "700", color: pal.onAccent },
  heroMeta: { marginTop: verticalScale(2), fontSize: fontSize(11), color: pal.muted },
  heroAmt: {
    marginTop: verticalScale(18),
    textAlign: "center",
    fontSize: fontSize(32),
    fontWeight: "800",
    color: pal.onAccent,
    letterSpacing: -0.6,
  },
  details: { paddingHorizontal: scale(14), backgroundColor: pal.card },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: moderateScale(12),
    paddingVertical: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: pal.border,
  },
  rowLabel: { fontSize: fontSize(11), fontWeight: "500", color: pal.muted },
  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: fontSize(13),
    fontWeight: "700",
    color: pal.fg,
  },
  msgBlock: {
    paddingVertical: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: pal.border,
  },
  msg: { marginTop: verticalScale(4), fontSize: fontSize(13), fontWeight: "500", color: pal.fg, lineHeight: fontSize(18) },
  helpHead: {
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    fontSize: fontSize(11),
    fontWeight: "500",
    color: pal.muted,
  },
  idBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: pal.iconTile,
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
  },
  idValue: {
    marginTop: verticalScale(2),
    fontSize: fontSize(11),
    fontWeight: "600",
    color: pal.fg,
    fontVariant: ["tabular-nums"],
  },
  helpNote: {
    marginTop: verticalScale(8),
    marginBottom: verticalScale(8),
    fontSize: fontSize(11),
    lineHeight: fontSize(16),
    color: pal.muted,
  },
  });
}
