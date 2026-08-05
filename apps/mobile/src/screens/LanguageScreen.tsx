import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type AppLang, setAppLang } from "../lib/guest";
import { colors } from "../theme/colors";

type Props = {
  onFinish: (lang: AppLang) => void;
};

/** Splash dan keyin — O'zbek / Русский. */
export function LanguageScreen({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, slide]);

  const pick = async (lang: AppLang) => {
    await setAppLang(lang);
    onFinish(lang);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
      <Animated.View style={{ opacity, transform: [{ translateY: slide }], flex: 1 }}>
        <Text style={styles.logo}>
          Mysaloon<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.title}>Tilni tanlang</Text>
        <Text style={styles.sub}>Выберите язык</Text>

        <View style={styles.list}>
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => void pick("uz")}
          >
            <Text style={styles.flag}>🇺🇿</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>O'zbekcha</Text>
              <Text style={styles.cardSub}>Davom etish</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => void pick("ru")}
          >
            <Text style={styles.flag}>🇷🇺</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Русский</Text>
              <Text style={styles.cardSub}>Продолжить</Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.fg,
    letterSpacing: -1,
  },
  dot: { color: colors.brandDot },
  title: {
    marginTop: 36,
    fontSize: 28,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "600",
    color: colors.muted,
  },
  list: { marginTop: 36, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  cardPressed: { opacity: 0.85, borderColor: colors.fg },
  flag: { fontSize: 28 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.fg },
  cardSub: { fontSize: 13, fontWeight: "600", color: colors.muted },
});
