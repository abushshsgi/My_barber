import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
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
const OPEN_MS = 480;
const CLOSE_MS = 280;
const USE_NATIVE = Platform.OS !== "web";

/** Pastdan 480ms sheet — 1 click muzlatish / ochish. */
export function WalletFreezeScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const me = useWalletMe();
  const [busy, setBusy] = useState(false);
  const [statusLabel, setStatusLabel] = useState<"idle" | "freeze" | "unfreeze">("idle");
  const frozen = Boolean(me.isFrozen);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const busyRef = useRef(false);
  const closingRef = useRef(false);
  const backdrop = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(520)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(sheetY, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE,
      }),
    ]).start();
  }, [backdrop, sheetY]);

  const animateClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(sheetY, {
        toValue: 520,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE,
      }),
    ]).start(() => {
      if (navigation.canGoBack()) navigation.goBack();
    });
  };

  const close = () => {
    if (busyRef.current) return;
    animateClose();
  };

  const run = async () => {
    if (busyRef.current || closingRef.current) return;
    const action = frozenRef.current ? "unfreeze" : "freeze";
    busyRef.current = true;
    setBusy(true);
    setStatusLabel(action);
    try {
      await setWalletFreeze(
        action,
        action === "freeze" ? "Mobil ilovadan muzlatildi" : "Mobil ilovadan ochildi",
      );
      me.refresh();
      animateClose();
    } catch (e) {
      busyRef.current = false;
      closingRef.current = false;
      setBusy(false);
      setStatusLabel("idle");
      Alert.alert("Xato", e instanceof Error ? e.message : "Amal bajarilmadi");
    }
  };

  const primaryTitle = frozen ? "Ochish" : "Muzlatish";
  const loadingTitle = statusLabel === "unfreeze" ? "Ochilmoqda…" : "Muzlatilmoqda…";

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backdrop,
          {
            opacity: backdrop.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        ]}
      />

      {/* Faqat sheet ustidagi bo'sh joy — tugmalarni yopmaydi */}
      <Pressable style={styles.dismissZone} onPress={close} accessibilityLabel="Yopish" />

      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>{frozen ? "Kartani ochish?" : "Kartani muzlatish?"}</Text>
        <Text style={styles.desc}>
          {frozen
            ? "Ochilgach o'tkazma, sovg'a va QR to'lov yana ishlaydi."
            : "To'lov va o'tkazmalar to'xtaydi. Istalgan paytda ochishingiz mumkin."}
        </Text>

        <Pressable
          style={[styles.primary, busy && styles.disabled]}
          disabled={busy}
          onPress={() => void run()}
          accessibilityRole="button"
        >
          {busy ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.primaryText}>{loadingTitle}</Text>
            </View>
          ) : (
            <Text style={styles.primaryText}>{primaryTitle}</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.secondary, busy && styles.disabled]}
          disabled={busy}
          onPress={close}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Bekor qilish</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  dismissZone: {
    ...StyleSheet.absoluteFillObject,
    bottom: 280,
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 20,
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
    minHeight: 54,
    justifyContent: "center",
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  secondary: {
    backgroundColor: "#F0EEEA",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 54,
    justifyContent: "center",
  },
  secondaryText: { color: INK, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.7 },
});
