import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setWalletFreeze } from "../../api/wallet";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletFreeze">;

const INK = "#1A1A1A";
const MUTED = "#8A8A8E";
const SOFT_BG = "#F7F5F2";

/** Kartani muzlatish / ochish — backend `/wallet/freeze/`. */
export function WalletFreezeScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const me = useWalletMe();
  const [busy, setBusy] = useState(false);
  const frozen = me.isFrozen;

  const run = async (action: "freeze" | "unfreeze") => {
    if (busy) return;
    setBusy(true);
    try {
      await setWalletFreeze(
        action,
        action === "freeze" ? "Mobil ilovadan muzlatildi" : "Mobil ilovadan ochildi",
      );
      me.refresh();
      Alert.alert(
        action === "freeze" ? "Muzlatildi" : "Ochildi",
        action === "freeze"
          ? "O'tkazma va QR to'lov vaqtincha to'xtatildi."
          : "Hamyon yana ishlaydi.",
      );
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Amal bajarilmadi");
    } finally {
      setBusy(false);
    }
  };

  const confirmFreeze = () => {
    Alert.alert(
      "Kartani muzlatish?",
      "O'tkazma, sovg'a va QR to'lov to'xtatiladi. Istalgan paytda ochishingiz mumkin.",
      [
        { text: "Bekor", style: "cancel" },
        { text: "Muzlatish", style: "destructive", onPress: () => void run("freeze") },
      ],
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Pressable>
        <Text style={styles.headerTitle}>Kartani muzlatish</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name={frozen ? "snow" : "shield-checkmark-outline"} size={28} color={INK} />
        </View>
        <Text style={styles.status}>{frozen ? "Muzlatilgan" : "Faol"}</Text>
        <Text style={styles.body}>
          {frozen
            ? "Hamyondan chiqimlar bloklangan. Admin panelda ham ko'rinadi."
            : "Yo'qotilgan telefon yoki shubhali harakatda kartani darhol muzlating."}
        </Text>
        {me.freezeReason ? <Text style={styles.reason}>{me.freezeReason}</Text> : null}

        <Pressable
          style={[styles.cta, busy && { opacity: 0.6 }]}
          disabled={busy || me.loading}
          onPress={() => (frozen ? void run("unfreeze") : confirmFreeze())}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.ctaText}>{frozen ? "Kartani ochish" : "Kartani muzlatish"}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT_BG, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: INK,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#F0EEEA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  status: { fontSize: 22, fontWeight: "800", color: INK },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    textAlign: "center",
  },
  reason: {
    marginTop: 4,
    fontSize: 12,
    color: MUTED,
    fontStyle: "italic",
  },
  cta: {
    marginTop: 14,
    alignSelf: "stretch",
    backgroundColor: INK,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
