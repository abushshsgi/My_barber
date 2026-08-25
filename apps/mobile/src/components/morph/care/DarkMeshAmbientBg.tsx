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

const STYLE_ID = "morph-care-dark-mesh";

/** Rasm: qorong‘i mesh + mis/amber + sage/teal + grain. */
function ensureWebKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = `
    @keyframes morphCareMeshDrift {
      0% {
        background-position: 12% 22%, 88% 18%, 18% 78%, 82% 72%, 50% 50%;
        filter: hue-rotate(0deg);
      }
      50% {
        background-position: 78% 28%, 22% 68%, 72% 22%, 28% 88%, 48% 52%;
        filter: hue-rotate(8deg);
      }
      100% {
        background-position: 12% 22%, 88% 18%, 18% 78%, 82% 72%, 50% 50%;
        filter: hue-rotate(0deg);
      }
    }
    @keyframes morphCareGrain {
      0% { transform: translate(0, 0); }
      50% { transform: translate(-1.5%, 1%); }
      100% { transform: translate(0, 0); }
    }
  `;
  document.head.appendChild(tag);
}

function WebMesh() {
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
      backgroundColor: "#0c0e0c",
      backgroundImage: [
        "radial-gradient(ellipse 90% 70% at 18% 20%, rgba(180,110,55,0.42) 0%, transparent 58%)",
        "radial-gradient(ellipse 80% 65% at 88% 16%, rgba(95,130,95,0.38) 0%, transparent 55%)",
        "radial-gradient(ellipse 85% 70% at 22% 88%, rgba(70,105,85,0.32) 0%, transparent 58%)",
        "radial-gradient(ellipse 75% 60% at 86% 78%, rgba(160,95,50,0.28) 0%, transparent 52%)",
        "radial-gradient(ellipse 120% 90% at 50% 50%, rgba(20,24,20,0.55) 0%, transparent 70%)",
      ].join(","),
      backgroundRepeat: "no-repeat",
      backgroundSize: "180% 180%",
      animation: "morphCareMeshDrift 16s ease-in-out infinite",
    },
    children: createElement("div", {
      style: {
        position: "absolute",
        inset: "-20%",
        opacity: 0.22,
        pointerEvents: "none",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        backgroundSize: "180px 180px",
        animation: "morphCareGrain 8s ease-in-out infinite",
        mixBlendMode: "overlay",
      },
    }),
  });
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
  colors: readonly [string, string, string];
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
      { scale: interpolate(p.value, [0, 1], [1.02, 1.18]) },
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

/** Care hub — qorong‘i hypnotic mesh gradient (mis + sage). */
export function DarkMeshAmbientBg() {
  const { width, height } = useWindowDimensions();
  const dim = Math.max(width, height) * 1.9;

  if (Platform.OS === "web") {
    return <WebMesh />;
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0c0e0c" }]} />
      <MeshBlob
        duration={14000}
        dim={dim}
        colors={["rgba(180,110,55,0.45)", "rgba(120,70,40,0.12)", "transparent"]}
        rotateFrom={-18}
        rotateTo={14}
        xFrom={-width * 0.18}
        xTo={width * 0.1}
        yFrom={-height * 0.14}
        yTo={height * 0.06}
        opacity={0.95}
      />
      <MeshBlob
        duration={19000}
        dim={dim * 0.95}
        colors={["rgba(85,125,95,0.4)", "rgba(40,70,55,0.1)", "transparent"]}
        rotateFrom={12}
        rotateTo={-16}
        xFrom={width * 0.12}
        xTo={-width * 0.1}
        yFrom={-height * 0.08}
        yTo={height * 0.12}
        opacity={0.88}
      />
      <MeshBlob
        duration={23000}
        dim={dim * 0.85}
        colors={["rgba(150,90,45,0.28)", "rgba(60,90,70,0.14)", "transparent"]}
        rotateFrom={-8}
        rotateTo={20}
        xFrom={-width * 0.06}
        xTo={width * 0.14}
        yFrom={height * 0.1}
        yTo={-height * 0.08}
        opacity={0.75}
      />
      <View style={[StyleSheet.absoluteFill, styles.grainNative]} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fill: { flex: 1, borderRadius: 999 },
  grainNative: {
    backgroundColor: "transparent",
    opacity: 0.12,
    // Soft stipple without image asset — layered dots via borders on large view
    borderWidth: 0,
    shadowColor: "#8a7a60",
    shadowOpacity: 0.35,
    shadowRadius: 1,
  },
});
