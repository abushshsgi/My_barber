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
              <Ionicons name="scan-outline" size={36} color="#5B8DEF" />
            </View>
          </View>
        </View>

        <Text style={styles.heroTitle}>Tezroq to'lov?{"\n"}Ha, skanerlash!</Text>
        <Text style={styles.heroSub}>
          Sartarosh, do'st va oilaga QR orqali bir zumda to'lang
        </Text>

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
              <View style={[styles.sheetIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="wallet-outline" size={26} color="#111111" />
              </View>
              <Text style={styles.sheetLabel}>O'tkazma</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => navigation.navigate("WalletGift")}
            >
              <View style={[styles.sheetIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="flash-outline" size={26} color="#15803D" />
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
          <Ionicons name="close" size={20} color="#FFF" />
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
            placeholderTextColor="rgba(255,255,255,0.45)"
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
              <ActivityIndicator color="#111" />
            ) : (
              <Ionicons name="arrow-forward" size={20} color="#111" />
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
  root: { flex: 1, backgroundColor: "#FFF", paddingHorizontal: 20 },
  introTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backPlain: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  toolPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroArt: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  artBlock: {
    position: "absolute",
    borderRadius: 18,
  },
  artBack: {
    width: 110,
    height: 110,
    backgroundColor: "#BFDBFE",
    right: 48,
    top: 28,
  },
  artMid: {
    width: 100,
    height: 130,
    backgroundColor: "#86EFAC",
    left: 56,
    top: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  artFrame: {
    width: 48,
    height: 48,
    borderWidth: 3,
    borderColor: "#166534",
    borderRadius: 8,
  },
  artPhone: {
    width: 120,
    height: 160,
    borderRadius: 22,
    backgroundColor: "#F0F0F0",
    borderWidth: 6,
    borderColor: "#93C5FD",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  artPhoneScreen: {
    width: 88,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.6,
    lineHeight: 34,
    marginTop: 8,
  },
  heroSub: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#9CA3AF",
    paddingHorizontal: 12,
  },
  enableBtn: {
    marginTop: 22,
    alignSelf: "center",
    minWidth: 200,
    height: 52,
    paddingHorizontal: 28,
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
  enableText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  sheet: {
    marginTop: "auto",
    marginHorizontal: -20,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#111", marginBottom: 16 },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 8 },
  sheetItem: { width: "30%", alignItems: "center", gap: 8 },
  sheetIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetLabel: { fontSize: 12, fontWeight: "600", color: "#4B5563", textAlign: "center" },

  scanRoot: { flex: 1, backgroundColor: "#FAFAFA", paddingHorizontal: 20 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  scanFrameOuter: {
    width: 260,
    height: 260,
    borderRadius: 28,
    backgroundColor: "rgba(20,20,22,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrameInner: {
    width: 180,
    height: 180,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "#22C55E",
  },
  cTL: { top: 14, left: 14, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  cTR: { top: 14, right: 14, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  cBL: { bottom: 14, left: 14, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  cBR: { bottom: 14, right: 14, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  scanTitle: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  scanSub: {
    textAlign: "center",
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  manualBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  manualInput: { flex: 1, color: "#FFF", fontSize: 14, paddingVertical: 10 },
  manualGo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },

  payHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  payHeaderTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: "#111" },
  payCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 28,
  },
  payTo: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "600" },
  payName: { marginTop: 6, color: "#FFF", fontSize: 22, fontWeight: "800" },
  payBal: { marginTop: 10, color: "rgba(255,255,255,0.65)", fontSize: 13 },
  amtLabel: { textAlign: "center", color: "#9CA3AF", fontSize: 13, marginBottom: 8 },
  amtInput: {
    textAlign: "center",
    fontSize: 44,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -1,
    marginBottom: 24,
  },
});
