import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  message?: string;
};

/** Tayyor dan keyin — oq ekran, Mysaloon logo + akkaunt yaratilmoqda. */
export function AccountCreatingScreen({
  message = "Akkaunt yaratilmoqda…",
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const dot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(dot, {
        toValue: 1,
        duration: 360,
        delay: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, dot]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.brand, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.logo}>
          Mysaloon
          <Animated.Text style={[styles.dot, { opacity: dot }]}>.</Animated.Text>
        </Text>
        <Text style={styles.tag}>Salon · Barber · Go'zallik</Text>
        <ActivityIndicator style={styles.spinner} color={colors.fg} size="large" />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 42,
    fontWeight: "900",
    color: colors.fg,
    letterSpacing: -1.2,
  },
  dot: {
    color: colors.brandDot,
  },
  tag: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0.3,
  },
  spinner: {
    marginTop: 36,
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "700",
    color: colors.fg,
  },
});
