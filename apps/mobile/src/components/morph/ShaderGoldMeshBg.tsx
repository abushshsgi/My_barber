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

const BG = "#0c0d0b";
const STYLE_ID = "morph-gold-mesh-html";

/** Tailwind mesh + SVG grain — chat / parvarish. */
function ensureWebStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = `
    @keyframes morphGoldBlobA {
      0%, 100% { transform: translate(0, 0) rotate(-25deg) scale(1); }
      50% { transform: translate(6%, 8%) rotate(-18deg) scale(1.08); }
    }
    @keyframes morphGoldBlobB {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-8%, 5%) scale(1.06); }
    }
    @keyframes morphGoldBlobC {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
      50% { transform: translate(4%, -6%) scale(1.1); opacity: 0.65; }
    }
  `;
  document.head.appendChild(tag);
}

function WebHtmlMesh() {
  useEffect(() => {
    ensureWebStyles();
  }, []);

  return createElement(
    "div",
    {
      "aria-hidden": true,
      style: {
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        backgroundColor: BG,
      },
    },
    createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          opacity: 0.8,
          mixBlendMode: "screen",
          filter: "blur(80px)",
          transform: "scale(1.1)",
        },
      },
      createElement("div", {
        style: {
          position: "absolute",
          top: "10%",
          left: "15%",
          width: 500,
          height: 300,
          borderRadius: "9999px",
          background:
            "linear-gradient(to top right, #8a7335, #d4af37, #3a4028)",
          animation: "morphGoldBlobA 14s ease-in-out infinite",
          willChange: "transform",
        },
      }),
      createElement("div", {
        style: {
          position: "absolute",
          top: "20%",
          right: "10%",
          width: 600,
          height: 600,
          borderRadius: "9999px",
          background:
            "linear-gradient(to bottom right, #2a301e, #6e5d28, #0d0e0a)",
          animation: "morphGoldBlobB 18s ease-in-out infinite",
          willChange: "transform",
        },
      }),
      createElement("div", {
        style: {
          position: "absolute",
          bottom: "5%",
          left: "30%",
          width: 400,
          height: 400,
          borderRadius: "9999px",
          backgroundColor: "#a38b45",
          opacity: 0.5,
          animation: "morphGoldBlobC 16s ease-in-out infinite",
          willChange: "transform",
        },
      }),
    ),
    createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          opacity: 0.25,
          pointerEvents: "none",
          mixBlendMode: "overlay",
        },
      },
      createElement(
        "svg",
        { style: { width: "100%", height: "100%" }, xmlns: "http://www.w3.org/2000/svg" },
        createElement(
          "filter",
          { id: "morphGoldNoiseFilter" },
          createElement("feTurbulence", {
            type: "fractalNoise",
            baseFrequency: "0.8",
            numOctaves: "3",
            stitchTiles: "stitch",
          }),
        ),
        createElement("rect", {
          width: "100%",
          height: "100%",
          filter: "url(#morphGoldNoiseFilter)",
        }),
      ),
    ),
  );
}

function MeshBlob({
  duration,
  dim,
  colors,
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
  colors: readonly [string, string, ...string[]];
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
      { scale: interpolate(p.value, [0, 1], [1.02, 1.12]) },
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
        colors={[...colors]}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.9, y: 0.95 }}
        style={styles.fill}
      />
    </Animated.View>
  );
}

function NativeHtmlMesh() {
  const { width, height } = useWindowDimensions();
  const dim = Math.max(width, height) * 1.6;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BG }]} />
      <MeshBlob
        duration={14000}
        dim={dim * 0.85}
        colors={["#8a7335", "#d4af37", "#3a4028"]}
        rotateFrom={-25}
        rotateTo={-18}
        xFrom={-width * 0.2}
        xTo={-width * 0.08}
        yFrom={-height * 0.28}
        yTo={-height * 0.18}
        opacity={0.75}
      />
      <MeshBlob
        duration={18000}
        dim={dim}
        colors={["#2a301e", "#6e5d28", "#0d0e0a"]}
        rotateFrom={8}
        rotateTo={-6}
        xFrom={width * 0.12}
        xTo={width * 0.02}
        yFrom={-height * 0.15}
        yTo={-height * 0.05}
        opacity={0.85}
      />
      <MeshBlob
        duration={16000}
        dim={dim * 0.7}
        colors={["#a38b45", "rgba(163,139,69,0.35)", "transparent"]}
        rotateFrom={-4}
        rotateTo={10}
        xFrom={-width * 0.05}
        xTo={width * 0.05}
        yFrom={height * 0.18}
        yTo={height * 0.1}
        opacity={0.55}
      />
      <View style={[StyleSheet.absoluteFill, styles.grain]} />
    </View>
  );
}

/** HTML mesh gradient (oltin / zaytun + grain) — chat va parvarish. */
export function ShaderGoldMeshBg() {
  if (Platform.OS === "web") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <WebHtmlMesh />
      </View>
    );
  }
  return <NativeHtmlMesh />;
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fill: { flex: 1, borderRadius: 999 },
  grain: { opacity: 0.2, backgroundColor: "rgba(163,139,69,0.08)" },
});
