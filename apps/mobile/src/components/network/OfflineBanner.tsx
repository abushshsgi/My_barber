import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { isOnline, probeNetwork, subscribeNetwork } from "../../lib/network-status";
import { fontSize, moderateScale, scale, verticalScale } from "../../utils/responsive";

/** Uzilgan Wi-Fi illyustratsiyasi. */
export function NoConnectionIllustration({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx={32} cy={32} r={30} fill="#2A2A2A" />
      <Path
        d="M14 27c10-9 26-9 36 0M20 33.5c7-6 17-6 24 0M26 40c3.5-2.8 8.5-2.8 12 0"
        stroke="#9CA3AF"
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      <Circle cx={32} cy={46} r={2.8} fill="#9CA3AF" />
      <Path d="M17 17l30 30" stroke="#F97316" strokeWidth={3.6} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Global "internet yo'q" banneri. Sessiya va kesh saqlanadi —
 * aloqa tiklanganda avtomatik yashiriladi.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(isOnline());
  const [restored, setRestored] = useState(false);
  const [checking, setChecking] = useState(false);
  const anim = useRef(new Animated.Value(online ? 0 : 1)).current;

  useEffect(
    () =>
      subscribeNetwork((next) => {
        setOnline(next);
        if (next) {
          setRestored(true);
          setTimeout(() => setRestored(false), 2200);
        }
      }),
    [],
  );

  const visible = !online || restored;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [anim, visible]);

  const onRetry = async () => {
    setChecking(true);
    await probeNetwork();
    setChecking(false);
  };

  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      style={[
        styles.wrap,
        {
          top: insets.top + verticalScale(6),
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
          ],
        },
      ]}
    >
      {online ? (
        <View style={[styles.card, styles.cardOk]} accessibilityLiveRegion="polite">
          <Text style={styles.title}>{t("offline.restored")}</Text>
        </View>
      ) : (
        <View style={styles.card} accessibilityRole="alert">
          <NoConnectionIllustration />
          <View style={styles.texts}>
            <Text style={styles.title}>{t("offline.title")}</Text>
            <Text style={styles.body}>{t("offline.body")}</Text>
          </View>
          <Pressable
            onPress={onRetry}
            disabled={checking}
            style={({ pressed }) => [styles.retry, (pressed || checking) && styles.retryPressed]}
            hitSlop={8}
          >
            <Text style={styles.retryText}>{t("offline.retry")}</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: scale(12),
    right: scale(12),
    zIndex: 9999,
    elevation: 30,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    backgroundColor: "#111111",
    borderRadius: moderateScale(18),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardOk: {
    width: "auto",
    backgroundColor: "#16A34A",
    paddingHorizontal: scale(18),
  },
  texts: { flex: 1, minWidth: 0 },
  title: { color: "#FFFFFF", fontSize: fontSize(14), fontWeight: "700" },
  body: { color: "#D4D4D4", fontSize: fontSize(12), marginTop: 2, lineHeight: fontSize(16) },
  retry: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(7),
  },
  retryPressed: { opacity: 0.6 },
  retryText: { color: "#111111", fontSize: fontSize(12), fontWeight: "700" },
});
