import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatSomLabel } from "../../lib/wallet-format";
import { parseWalletBalance } from "../../api/wallet";
import { fontSize, moderateScale, verticalScale } from "../../utils/responsive";

type Props = {
  amount: string;
  visible: boolean;
  onClose: () => void;
};

export function WalletTopUpCelebration({ amount, visible, onClose }: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.6);
    fade.setValue(0);
    ring.setValue(0.4);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ring, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        ]),
      ),
    ]).start();
    const timer = setTimeout(onClose, 4200);
    return () => clearTimeout(timer);
  }, [visible, fade, onClose, ring, scale]);

  const label = formatSomLabel(parseWalletBalance(amount));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
          <Animated.View style={[styles.glow, { transform: [{ scale: ring }] }]} />
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Hamyoningiz to'ldirildi</Text>
          <Text style={styles.amount}>+{label}</Text>
          <Text style={styles.hint}>Pul hisobingizga tushdi</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 8, 12, 0.62)",
    alignItems: "center",
    justifyContent: "center",
    padding: moderateScale(24),
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: moderateScale(28),
    backgroundColor: "#111111",
    alignItems: "center",
    paddingVertical: verticalScale(36),
    paddingHorizontal: moderateScale(24),
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(22, 163, 74, 0.28)",
    top: -40,
  },
  badge: {
    width: moderateScale(72),
    height: moderateScale(72),
    borderRadius: moderateScale(36),
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(18),
  },
  title: {
    color: "#FFFFFF",
    fontSize: fontSize(20),
    fontWeight: "800",
    textAlign: "center",
  },
  amount: {
    marginTop: verticalScale(8),
    color: "#4ADE80",
    fontSize: fontSize(28),
    fontWeight: "800",
  },
  hint: {
    marginTop: verticalScale(8),
    color: "rgba(255,255,255,0.62)",
    fontSize: fontSize(14),
  },
});
