import { LinearGradient } from "expo-linear-gradient";
import { createElement, useEffect } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const AURORA_STYLE_ID = "morph-chat-aurora-mono";

const DARK_MESH = [
  "radial-gradient(ellipse 90% 70% at 15% 10%, rgba(255,255,255,0.1) 0%, transparent 58%)",
  "radial-gradient(ellipse 80% 80% at 90% 5%, rgba(140,140,140,0.18) 0%, transparent 55%)",
  "radial-gradient(ellipse 95% 75% at 8% 92%, rgba(70,70,70,0.65) 0%, transparent 58%)",
  "radial-gradient(ellipse 85% 70% at 95% 85%, rgba(0,0,0,0.9) 0%, transparent 55%)",
].join(",");

const LIGHT_MESH = [
  "radial-gradient(ellipse 90% 70% at 12% 8%, #ffffff 0%, transparent 56%)",
  "radial-gradient(ellipse 80% 80% at 88% 12%, rgba(255,255,255,1) 0%, transparent 50%)",
  "radial-gradient(ellipse 95% 75% at 10% 88%, rgba(245,245,245,0.95) 0%, transparent 58%)",
  "radial-gradient(ellipse 70% 60% at 92% 82%, rgba(228,228,228,0.7) 0%, transparent 52%)",
].join(",");

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
  `;
  document.head.appendChild(tag);
}

function WebMesh({ light }: { light: boolean }) {
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
      backgroundColor: light ? "#ffffff" : "#0a0a0a",
      backgroundImage: light ? LIGHT_MESH : DARK_MESH,
      backgroundRepeat: "no-repeat",
      backgroundSize: "220% 220%",
      animation: "morphChatAurora 16s ease-in-out infinite",
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

function NativeMesh({ light }: { light: boolean }) {
  const { width, height } = useWindowDimensions();
  const dim = Math.max(width, height) * 1.85;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <LinearGradient
        colors={light ? ["#ffffff", "#f6f6f6", "#ffffff"] : ["#0a0a0a", "#1a1a1a", "#0a0a0a"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <FlowSheet
        colors={
          light
            ? ["#ffffff", "#ececec", "#dcdcdc", "#ffffff"]
            : ["#111111", "#4a4a4a", "#8a8a8a", "#111111"]
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
          light
            ? ["#ffffff", "#e8e8e8", "#d0d0d0", "#ffffff"]
            : ["#000000", "#5c5c5c", "#8d8d8d", "#000000"]
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
    </View>
  );
}

function Mesh({ light }: { light: boolean }) {
  return Platform.OS === "web" ? <WebMesh light={light} /> : <NativeMesh light={light} />;
}

/** 0 = qora fon + oq matn, 1 = oq fon + qora matn. */
export function useWelcomeBgCycle(): SharedValue<number> {
  const cycle = useSharedValue(0);
  useEffect(() => {
    cycle.value = withDelay(
      500,
      withRepeat(
        withTiming(1, { duration: 5600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [cycle]);
  return cycle;
}

type Props = {
  /** 0 dark, 1 light. Berilmasa — faqat qora palitra. */
  cycle?: SharedValue<number>;
};

/** Chat foni — oq/qora gradient; welcome da qora↔oq o‘tadi. */
export function ChatAmbientBg({ cycle }: Props = {}) {
  const darkStyle = useAnimatedStyle(() => ({
    opacity: cycle ? interpolate(cycle.value, [0, 1], [1, 0.88]) : 1,
  }));
  const lightStyle = useAnimatedStyle(() => ({
    opacity: cycle ? interpolate(cycle.value, [0, 1], [0, 0.16]) : 0,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, darkStyle]}>
        <Mesh light={false} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, lightStyle]}>
        <Mesh light />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fill: { flex: 1 },
});
