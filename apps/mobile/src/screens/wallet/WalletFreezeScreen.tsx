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

/** Pastdan chiqadigan muzlatish / ochish sheet (Uzum uslubi). */
export function WalletFreezeScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const me = useWalletMe();
  const [busy, setBusy] = useState(false);
  const frozen = me.isFrozen;

  const close = () => {
    if (!busy) navigation.goBack();
  };

  const run = async (action: "freeze" | "unfreeze") => {
    if (busy) return;
    setBusy(true);
    try {
      await setWalletFreeze(
        action,
        action === "freeze" ? "Mobil ilovadan muzlatildi" : "Mobil ilovadan ochildi",
      );
      me.refresh();
      navigation.goBack();
    } catch (e) {
      setBusy(false);
      Alert.alert("Xato", e instanceof Error ? e.message : "Amal bajarilmadi");
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Yopish" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{frozen ? "Kartani ochish?" : "Kartani muzlatish?"}</Text>
        <Text style={styles.desc}>
          {frozen
            ? "Ochilgach o'tkazma, sovg'a va QR to'lov yana ishlaydi. Bir necha soniyada ochasiz."
            : "To'lov, o'tkazma va QR amallarini qila olmaysiz. Istalgan paytda bir necha soniyada ochishingiz mumkin."}
        </Text>

        <Pressable
          style={[styles.primary, busy && styles.disabled]}
          disabled={busy || me.loading}
          onPress={() => void run(frozen ? "unfreeze" : "freeze")}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryText}>{frozen ? "Ochish" : "Muzlatish"}</Text>
          )}
        </Pressable>

        <Pressable style={[styles.secondary, busy && styles.disabled]} disabled={busy} onPress={close}>
          <Text style={styles.secondaryText}>Bekor qilish</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 2,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    marginBottom: 22,
  },
  primary: {
    backgroundColor: INK,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  secondary: {
    backgroundColor: "#F0EEEA",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryText: { color: INK, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
