import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatSomLabel, type WalletTx } from "../../lib/wallet-format";

type Props = {
  tx: WalletTx | null;
  visible: boolean;
  onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function WalletTransactionReceiptSheet({ tx, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={18} color="#64748B" />
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
                    color="#FFF"
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
              color={copied ? "#16A34A" : "#64748B"}
            />
          </Pressable>
          <Text style={styles.helpNote}>
            Supportga yozganda Yozuv ID ni yuboring.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  close: {
    position: "absolute",
    right: 16,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  title: { fontSize: 17, fontWeight: "800", color: "#0A0A0A" },
  lead: { marginTop: 4, fontSize: 12, color: "#94A3B8", marginBottom: 14 },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.1)",
  },
  hero: {
    backgroundColor: "#111111",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  heroMeta: { marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.6)" },
  heroAmt: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.6,
  },
  details: { paddingHorizontal: 14, backgroundColor: "#FFF" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,23,42,0.08)",
  },
  rowLabel: { fontSize: 11, fontWeight: "500", color: "#94A3B8" },
  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#0A0A0A",
  },
  msgBlock: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,23,42,0.08)",
  },
  msg: { marginTop: 4, fontSize: 13, fontWeight: "500", color: "#0A0A0A", lineHeight: 18 },
  helpHead: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
  },
  idBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  idValue: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#0A0A0A",
    fontVariant: ["tabular-nums"],
  },
  helpNote: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 11,
    lineHeight: 16,
    color: "#94A3B8",
  },
});
