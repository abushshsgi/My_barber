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
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";

const AURORA_STYLE_ID = "morph-chat-aurora-kf";

function ensureWebKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(AURORA_STYLE_ID)) return;
  const tag = document.createElement("style");
  tag.id = AURORA_STYLE_ID;
  tag.textContent = `
    @keyframes morphChatAurora {
      0% { background-position: 0% 20%, 100% 0%, 0% 100%, 100% 80%; }
      40% { background-position: 80% 0%, 20% 80%, 70% 30%, 10% 100%; }
      70% { background-position: 40% 100%, 0% 40%, 100% 10%, 60% 20%; }
      100% { background-position: 0% 20%, 100% 0%, 0% 100%, 100% 80%; }
    }
    @keyframes morphChatHue {
      0% { filter: hue-rotate(0deg) saturate(1.2); }
      50% { filter: hue-rotate(32deg) saturate(1.35); }
      100% { filter: hue-rotate(0deg) saturate(1.2); }
    }
  `;
  document.head.appendChild(tag);
}

function WebAurora({ dark }: { dark: boolean }) {
  useEffect(() => {
    ensureWebKeyframes();
  }, []);

  const image = dark
    ? [
        "radial-gradient(ellipse 90% 70% at 15% 10%, rgba(59,130,246,0.95) 0%, transparent 58%)",
        "radial-gradient(ellipse 80% 80% at 90% 5%, rgba(139,92,246,0.88) 0%, transparent 55%)",
        "radial-gradient(ellipse 95% 75% at 8% 92%, rgba(45,212,191,0.82) 0%, transparent 58%)",
        "radial-gradient(ellipse 85% 70% at 95% 85%, rgba(244,114,182,0.7) 0%, transparent 55%)",
      ].join(",")
    : [
        "radial-gradient(ellipse 90% 70% at 15% 10%, rgba(96,165,250,0.85) 0%, transparent 58%)",
        "radial-gradient(ellipse 80% 80% at 90% 5%, rgba(196,181,253,0.8) 0%, transparent 55%)",
        "radial-gradient(ellipse 95% 75% at 8% 92%, rgba(94,234,212,0.72) 0%, transparent 58%)",
        "radial-gradient(ellipse 85% 70% at 95% 85%, rgba(249,168,212,0.65) 0%, transparent 55%)",
      ].join(",");

  return createElement("div", {
    "aria-hidden": true,
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      overflow: "hidden",
      backgroundColor: dark ? "#0b1020" : "#e8eefc",
      backgroundImage: image,
      backgroundRepeat: "no-repeat",
      backgroundSize: "220% 220%",
      animation:
        "morphChatAurora 16s ease-in-out infinite, morphChatHue 22s ease-in-out infinite",
    },
  });
}

function FlowSheet({
  colors,
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
  colors: [string, string, ...string[]];
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
      {
        rotate: `${interpolate(p.value, [0, 1], [rotateFrom, rotateTo])}deg`,
      },
      { scale: interpolate(p.value, [0, 1], [1.05, 1.18]) },
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
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
    </Animated.View>
  );
}

/** Chat foni — oqib turadigan rangli gradient (Gemini uslubi). */
export function ChatAmbientBg() {
  const { theme } = useMorphAppearance();
  const { width, height } = useWindowDimensions();
  const dark = theme === "dark";
  const dim = Math.max(width, height) * 1.85;

  if (Platform.OS === "web") {
    return <WebAurora dark={dark} />;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <LinearGradient
        colors={dark ? ["#0b1020", "#14122a", "#0b1020"] : ["#e8eefc", "#f3e8ff", "#e8fbf7"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <FlowSheet
        colors={
          dark
            ? ["#2563eb", "#7c3aed", "#06b6d4", "#2563eb"]
            : ["#60a5fa", "#c4b5fd", "#5eead4", "#60a5fa"]
        }
        duration={18000}
        dim={dim}
        rotateFrom={-18}
        rotateTo={16}
        xFrom={-width * 0.12}
        xTo={width * 0.1}
        yFrom={-height * 0.08}
        yTo={height * 0.1}
        opacity={0.72}
      />
      <FlowSheet
        colors={
          dark
            ? ["#14b8a6", "#3b82f6", "#ec4899", "#14b8a6"]
            : ["#2dd4bf", "#93c5fd", "#f9a8d4", "#2dd4bf"]
        }
        duration={24000}
        dim={dim}
        rotateFrom={12}
        rotateTo={-20}
        xFrom={width * 0.08}
        xTo={-width * 0.1}
        yFrom={height * 0.06}
        yTo={-height * 0.1}
        opacity={0.55}
      />
      <FlowSheet
        colors={
          dark
            ? ["#8b5cf6", "#0ea5e9", "#22d3ee", "#8b5cf6"]
            : ["#a78bfa", "#38bdf8", "#67e8f9", "#a78bfa"]
        }
        duration={30000}
        dim={dim}
        rotateFrom={8}
        rotateTo={28}
        xFrom={-width * 0.06}
        xTo={width * 0.08}
        yFrom={height * 0.08}
        yTo={-height * 0.06}
        opacity={0.42}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fill: { flex: 1 },
});
