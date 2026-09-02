import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MAX_QR_AMOUNT,
  MIN_QR_AMOUNT,
  payQr,
  resolveQrPay,
  type QrResolveResult,
} from "../../api/wallet";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import { formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletQrPay">;

type Phase = "intro" | "scan" | "pay";

/** QR to'lov — intro + scan + pay (rasmdagidek). */
export function WalletQrPayScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const me = useWalletMe();
  const [phase, setPhase] = useState<Phase>("intro");
  const [code, setCode] = useState("");
  const [resolved, setResolved] = useState<QrResolveResult | null>(null);
  const [amount, setAmount] = useState("");
  const [resolving, setResolving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [torch, setTorch] = useState(false);

  const onResolve = useCallback(async (raw?: string) => {
    const trimmed = (raw ?? code).trim();
    if (trimmed.length < 8) {
      Alert.alert("Xato", "QR kodni kiriting yoki skanerlang.");
      return;
    }
    setResolving(true);
    try {
      const data = await resolveQrPay(trimmed);
      setResolved(data);
      setCode(trimmed);
      if (data.request && Number(data.request.amount) > 0) {
        setAmount(formatSomAmount(Math.round(Number(data.request.amount))));
      }
      setPhase("pay");
    } catch (e) {
      setResolved(null);
      Alert.alert("Xato", e instanceof Error ? e.message : "QR topilmadi");
    } finally {
      setResolving(false);
    }
  }, [code]);

  const onPay = async () => {
    if (!resolved || paying) return;
    const amt = Number(amount.replace(/\D/g, "")) || undefined;
    if (amt != null && (amt < MIN_QR_AMOUNT || amt > MAX_QR_AMOUNT)) {
      Alert.alert(
        "Xato",
        `Summa ${formatSomLabel(MIN_QR_AMOUNT)}–${formatSomLabel(MAX_QR_AMOUNT)}`,
      );
      return;
    }
    if (amt != null && amt > me.balance) {
      Alert.alert("Yetarli emas", "Balans yetarli emas.");
      return;
    }
    setPaying(true);
    try {
      const res = await payQr({ payload: resolved.payload, amount: amt });
      me.refresh();
      Alert.alert("To'landi", `${formatSomLabel(Number(res.amount))} → ${res.barber_name}`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "To'lov amalga oshmadi");
    } finally {
      setPaying(false);
    }
  };

  if (phase === "intro") {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.introTop}>
          <Pressable style={styles.backPlain} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </Pressable>
          <View style={styles.toolPill}>
            <Pressable
              style={styles.toolBtn}
              onPress={() => Alert.alert("Yordam", "Sartarosh QR kodini skanerlang yoki kodni joylashtiring.")}
            >
              <Ionicons name="help-circle-outline" size={20} color="#111" />
            </Pressable>
            <Pressable
              style={styles.toolBtn}
              onPress={() => {
                setPhase("scan");
                Alert.alert("Galereya", "Hozircha kodni qo'lda kiriting yoki joylashtiring.");
              }}
            >
              <Ionicons name="images-outline" size={18} color="#111" />
            </Pressable>
            <Pressable style={styles.toolBtn} onPress={() => setTorch((v) => !v)}>
              <Ionicons name={torch ? "flash" : "flash-outline"} size={18} color="#111" />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroArt}>
          <View style={[styles.artBlock, styles.artBack]} />
          <View style={[styles.artBlock, styles.artMid]}>
            <View style={styles.artFrame} />
          </View>
          <View style={styles.artPhone}>
            <View style={styles.artPhoneScreen}>
              <Ionicons name="scan-outline" size={36} color="#111111" />
            </View>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Tezroq to'lov?{"\n"}Ha, skanerlash!</Text>
          <Text style={styles.heroSub}>
            Sartarosh, do'st va oilaga QR orqali bir zumda to'lang
          </Text>
        </View>

        <Pressable style={styles.enableBtn} onPress={() => setPhase("scan")}>
          <Text style={styles.enableText}>QR skanerni yoqish</Text>
        </Pressable>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>To'lash va yuborish</Text>
          <View style={styles.sheetRow}>
            <Pressable style={styles.sheetItem} onPress={() => setPhase("scan")}>
              <View style={[styles.sheetIcon, { backgroundColor: "#F0F0F0" }]}>
                <Ionicons name="qr-code-outline" size={26} color="#111111" />
              </View>
              <Text style={styles.sheetLabel}>Kod skaner</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => navigation.navigate("WalletGift")}
            >
              <View style={[styles.sheetIcon, { backgroundColor: "#F0F0F0" }]}>
                <Ionicons name="wallet-outline" size={26} color="#111111" />
              </View>
              <Text style={styles.sheetLabel}>O'tkazma</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => navigation.navigate("WalletGift")}
            >
              <View style={[styles.sheetIcon, { backgroundColor: "#F0F0F0" }]}>
                <Ionicons name="flash-outline" size={26} color="#111111" />
              </View>
              <Text style={styles.sheetLabel}>Tezkor</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (phase === "scan") {
    return (
      <View style={[styles.scanRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <Pressable style={styles.closeBtn} onPress={() => setPhase("intro")}>
          <Ionicons name="close" size={20} color="#111111" />
        </Pressable>

        <View style={styles.scanCenter}>
          <View style={styles.scanFrameOuter}>
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />
            <View style={styles.scanFrameInner}>
              <Ionicons name="qr-code" size={72} color="#111" />
            </View>
          </View>
        </View>

        <Text style={styles.scanTitle}>QR skaner</Text>
        <Text style={styles.scanSub}>To'lov uchun istalgan QR kodni skanerlang</Text>

        <View style={styles.manualBox}>
          <TextInput
            style={styles.manualInput}
            placeholder="yoki kodni joylashtiring…"
            placeholderTextColor="#A3A3A3"
            autoCapitalize="none"
            autoCorrect={false}
            value={code}
            onChangeText={setCode}
          />
          <Pressable
            style={[styles.manualGo, resolving && { opacity: 0.5 }]}
            disabled={resolving}
            onPress={() => void onResolve()}
          >
            {resolving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.payHeader}>
        <Pressable style={styles.backPlain} onPress={() => setPhase("scan")} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.payHeaderTitle}>To'lovni tasdiqlash</Text>
        <View style={{ width: 40 }} />
      </View>

      <LinearGradient colors={["#111827", "#111111"]} style={styles.payCard}>
        <Text style={styles.payTo}>Kimga</Text>
        <Text style={styles.payName}>{resolved?.barber.full_name || "—"}</Text>
        <Text style={styles.payBal}>Balans: {formatSomLabel(me.balance)}</Text>
      </LinearGradient>

      <Text style={styles.amtLabel}>Summa</Text>
      <TextInput
        style={styles.amtInput}
        keyboardType="number-pad"
        value={amount}
        onChangeText={(t) => setAmount(t.replace(/[^\d]/g, ""))}
        placeholder="0"
        placeholderTextColor="#D1D5DB"
      />

      <Pressable
        style={[styles.enableBtn, paying && { opacity: 0.5 }]}
        disabled={paying}
        onPress={() => void onPay()}
      >
        {paying ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.enableText}>To'lash</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF", paddingHorizontal: scale(20) },
  introTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(8),
  },
  backPlain: {
    width: scale(40),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  toolPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: scale(4),
    paddingVertical: verticalScale(4),
    gap: moderateScale(2),
  },
  toolBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(18),
    alignItems: "center",
    justifyContent: "center",
  },
  heroArt: {
    height: verticalScale(200),
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
  },
  artBlock: {
    position: "absolute",
    borderRadius: moderateScale(18),
  },
  artBack: {
    width: scale(110),
    height: scale(110),
    backgroundColor: "#E5E5E5",
    right: scale(48),
    top: verticalScale(28),
  },
  artMid: {
    width: scale(100),
    height: verticalScale(130),
    backgroundColor: "#D4D4D4",
    left: scale(56),
    top: verticalScale(36),
    alignItems: "center",
    justifyContent: "center",
  },
  artFrame: {
    width: scale(48),
    height: scale(48),
    borderWidth: 3,
    borderColor: "#111111",
    borderRadius: moderateScale(8),
  },
  artPhone: {
    width: scale(120),
    height: verticalScale(160),
    borderRadius: moderateScale(22),
    backgroundColor: "#FFFFFF",
    borderWidth: 6,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  artPhoneScreen: {
    width: scale(88),
    height: verticalScale(120),
    borderRadius: moderateScale(12),
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: scale(8),
  },
  heroTitle: {
    textAlign: "center",
    alignSelf: "center",
    fontSize: fontSize(28),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.6,
    lineHeight: fontSize(34),
    marginTop: verticalScale(8),
  },
  heroSub: {
    textAlign: "center",
    alignSelf: "center",
    marginTop: verticalScale(10),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: "#9CA3AF",
    paddingHorizontal: scale(12),
  },
  enableBtn: {
    marginTop: verticalScale(22),
    alignSelf: "center",
    minWidth: scale(200),
    height: verticalScale(52),
    paddingHorizontal: scale(28),
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  enableText: { color: "#FFF", fontSize: fontSize(15), fontWeight: "700" },
  sheet: {
    marginTop: "auto",
    marginHorizontal: -scale(20),
    backgroundColor: "#FFF",
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  handle: {
    alignSelf: "center",
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "#E5E7EB",
    marginBottom: verticalScale(14),
  },
  sheetTitle: { fontSize: fontSize(17), fontWeight: "800", color: "#111", marginBottom: verticalScale(16) },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", paddingBottom: verticalScale(8) },
  sheetItem: { width: "30%", alignItems: "center", gap: moderateScale(8) },
  sheetIcon: {
    width: scale(64),
    height: scale(64),
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  sheetLabel: { fontSize: fontSize(12), fontWeight: "600", color: "#4B5563", textAlign: "center" },

  scanRoot: { flex: 1, backgroundColor: "#FAFAFA", paddingHorizontal: scale(20) },
  closeBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  scanFrameOuter: {
    width: scale(260),
    height: scale(260),
    borderRadius: moderateScale(28),
    backgroundColor: "#F0F0F0",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrameInner: {
    width: scale(180),
    height: scale(180),
    borderRadius: moderateScale(20),
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: scale(36),
    height: scale(36),
    borderColor: "#22C55E",
  },
  cTL: { top: verticalScale(14), left: scale(14), borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: moderateScale(10) },
  cTR: { top: verticalScale(14), right: scale(14), borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: moderateScale(10) },
  cBL: { bottom: verticalScale(14), left: scale(14), borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: moderateScale(10) },
  cBR: { bottom: verticalScale(14), right: scale(14), borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: moderateScale(10) },
  scanTitle: {
    textAlign: "center",
    alignSelf: "center",
    color: "#111111",
    fontSize: fontSize(28),
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  scanSub: {
    textAlign: "center",
    alignSelf: "center",
    color: "#737373",
    fontSize: fontSize(14),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(20),
    paddingHorizontal: scale(12),
  },
  manualBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
    borderRadius: moderateScale(16),
    paddingLeft: scale(14),
    paddingRight: scale(6),
    paddingVertical: verticalScale(6),
  },
  manualInput: { flex: 1, color: "#111111", fontSize: fontSize(14), paddingVertical: verticalScale(10) },
  manualGo: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(14),
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  payHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  payHeaderTitle: { flex: 1, textAlign: "center", fontSize: fontSize(17), fontWeight: "800", color: "#111" },
  payCard: {
    borderRadius: moderateScale(24),
    padding: moderateScale(22),
    marginBottom: verticalScale(28),
  },
  payTo: { color: "rgba(255,255,255,0.55)", fontSize: fontSize(12), fontWeight: "600" },
  payName: { marginTop: verticalScale(6), color: "#FFF", fontSize: fontSize(22), fontWeight: "800" },
  payBal: { marginTop: verticalScale(10), color: "rgba(255,255,255,0.65)", fontSize: fontSize(13) },
  amtLabel: { textAlign: "center", color: "#9CA3AF", fontSize: fontSize(13), marginBottom: verticalScale(8) },
  amtInput: {
    textAlign: "center",
    fontSize: fontSize(44),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -1,
    marginBottom: verticalScale(24),
  },
});
