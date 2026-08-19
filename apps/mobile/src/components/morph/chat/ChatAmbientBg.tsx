import { LinearGradient } from "expo-linear-gradient";
import { createElement, useEffect } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const AURORA_STYLE_ID = "morph-chat-aurora-white";

function ensureWebKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(AURORA_STYLE_ID)) return;
  const tag = document.createElement("style");
  tag.id = AURORA_STYLE_ID;
  tag.textContent = `
    @keyframes morphChatWhite {
      0% { background-position: 8% 18%, 92% 8%, 12% 88%, 88% 78%; }
      50% { background-position: 78% 12%, 18% 72%, 68% 28%, 22% 92%; }
      100% { background-position: 8% 18%, 92% 8%, 12% 88%, 88% 78%; }
    }
  `;
  document.head.appendChild(tag);
}

function WebAurora() {
  useEffect(() => {
    ensureWebKeyframes();
  }, []);

  return createElement("div", {
    "aria-hidden": true,
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      overflow: "hidden",
      backgroundColor: "#0a0a0a",
      backgroundImage: [
        "radial-gradient(ellipse 80% 60% at 20% 15%, rgba(255,255,255,0.16) 0%, transparent 55%)",
        "radial-gradient(ellipse 70% 70% at 88% 10%, rgba(255,255,255,0.1) 0%, transparent 52%)",
        "radial-gradient(ellipse 90% 70% at 12% 88%, rgba(255,255,255,0.08) 0%, transparent 58%)",
        "radial-gradient(ellipse 75% 65% at 90% 82%, rgba(255,255,255,0.07) 0%, transparent 54%)",
      ].join(","),
      backgroundRepeat: "no-repeat",
      backgroundSize: "200% 200%",
      animation: "morphChatWhite 18s ease-in-out infinite",
    },
  });
}

function FlowSheet({
  duration,
  dim,
  rotateFrom,
  rotateTo,
  xFrom,
  xTo,
  yFrom,
  yTo,
  opacity,
}: {
  duration: number;
  dim: number;
  rotateFrom: number;
  rotateTo: number;
  xFrom: number;
  xTo: number;
  yFrom: number;
  yTo: number;
  opacity: number;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration, p]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 1], [xFrom, xTo]) },
      { translateY: interpolate(p.value, [0, 1], [yFrom, yTo]) },
      { rotate: `${interpolate(p.value, [0, 1], [rotateFrom, rotateTo])}deg` },
      { scale: interpolate(p.value, [0, 1], [1.04, 1.16]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: dim,
          height: dim,
          left: "50%",
          top: "50%",
          marginLeft: -dim / 2,
          marginTop: -dim / 2,
          opacity,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.04)", "transparent"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.fill}
      />
    </Animated.View>
  );
}

/** Chat foni — bitta qora palitra, faqat oq gradient harakatlanadi. */
export function ChatAmbientBg() {
  const { width, height } = useWindowDimensions();
  const dim = Math.max(width, height) * 1.85;

  if (Platform.OS === "web") {
    return <WebAurora />;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0a0a0a" }]} />
      <FlowSheet
        duration={16000}
        dim={dim}
        rotateFrom={-14}
        rotateTo={12}
        xFrom={-width * 0.1}
        xTo={width * 0.08}
        yFrom={-height * 0.06}
        yTo={height * 0.08}
        opacity={0.9}
      />
      <FlowSheet
        duration={22000}
        dim={dim}
        rotateFrom={10}
        rotateTo={-16}
        xFrom={width * 0.06}
        xTo={-width * 0.08}
        yFrom={height * 0.05}
        yTo={-height * 0.08}
        opacity={0.7}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fill: { flex: 1 },
});
