import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  onFinish: () => void;
};

/** Ilova ochilganda Mysaloon brand animatsiyasi. */
export function SplashScreen({ onFinish }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const dot = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(dot, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bar, {
        toValue: 1,
        duration: 700,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(280),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, [opacity, scale, dot, bar, onFinish]);

  const barWidth = bar.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.brand, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.logo}>
          Mysaloon
          <Animated.Text style={[styles.dot, { opacity: dot }]}>.</Animated.Text>
        </Text>
        <Text style={styles.tag}>Salon · Barber · Go'zallik</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: barWidth }]} />
        </View>
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
  track: {
    marginTop: 28,
    width: 120,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.fg,
    borderRadius: 999,
  },
});
