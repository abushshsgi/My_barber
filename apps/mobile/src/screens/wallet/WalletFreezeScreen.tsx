import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
const CLOSE_MS = 360;

/** Pastdan sekin chiqadigan muzlatish / ochish (razblokirovka) sheet. */
export function WalletFreezeScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const me = useWalletMe();
  const [busy, setBusy] = useState(false);
  const frozen = me.isFrozen;
  const backdrop = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(420)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdrop, sheetY]);

  const animateClose = (after?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 420,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        after?.();
        navigation.goBack();
      } else {
        closing.current = false;
      }
    });
  };

  const close = () => {
    if (!busy) animateClose();
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
      animateClose();
    } catch (e) {
      setBusy(false);
      closing.current = false;
      Alert.alert("Xato", e instanceof Error ? e.message : "Amal bajarilmadi");
    }
  };

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdrop.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Yopish" />
      </Animated.View>

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
            ? "Ochilgach o'tkazma, sovg'a va QR to'lov yana ishlaydi. Bir necha soniyada ochasiz."
            : "To'lov, o'tkazma va boshqalar bu hamyonga pul yubora olmaydi. Istalgan paytda ochishingiz mumkin."}
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
