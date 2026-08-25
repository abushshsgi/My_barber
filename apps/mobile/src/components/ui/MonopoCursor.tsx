import { createElement, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const RING = 40;
const DOT = 4;
const STYLE_ID = "monopo-rn-cursor";

const SPRING = { damping: 20, stiffness: 120, mass: 0.4 };
const HOVER_SPRING = { damping: 18, stiffness: 280, mass: 0.35 };

function ensureCursorCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = `
    html.monopo-rn-cursor-active,
    html.monopo-rn-cursor-active body,
    html.monopo-rn-cursor-active body * {
      cursor: none !important;
    }
    @media (pointer: coarse), (prefers-reduced-motion: reduce) {
      html.monopo-rn-cursor-active,
      html.monopo-rn-cursor-active body,
      html.monopo-rn-cursor-active body * {
        cursor: auto !important;
      }
    }
  `;
  document.head.appendChild(tag);
}

/**
 * monopo.vn-style magnetic cursor for Expo (RN Web / fine pointer).
 * Ring springs behind the pointer; center dot tracks instantly.
 * Native touch devices: no-op (no hardware cursor).
 */
export function MonopoCursor() {
  const [active, setActive] = useState(false);

  const mouseX = useSharedValue(-100);
  const mouseY = useSharedValue(-100);
  const ringX = useSharedValue(-100);
  const ringY = useSharedValue(-100);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.85);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    ensureCursorCss();
    document.documentElement.classList.add("monopo-rn-cursor-active");
    setActive(true);

    const interactive =
      'a, button, [role="button"], input, textarea, select, label, summary, [data-cursor="hover"]';

    const onMove = (e: MouseEvent) => {
      mouseX.value = e.clientX;
      mouseY.value = e.clientY;
      ringX.value = withSpring(e.clientX, SPRING);
      ringY.value = withSpring(e.clientY, SPRING);
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest(interactive)) return;
      ringScale.value = withSpring(1.5, HOVER_SPRING);
      ringOpacity.value = withSpring(1, HOVER_SPRING);
    };

    const onOut = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest(interactive)) return;
      const related = e.relatedTarget;
      if (related instanceof Element && related.closest(interactive)) return;
      ringScale.value = withSpring(1, HOVER_SPRING);
      ringOpacity.value = withSpring(0.85, HOVER_SPRING);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);

    return () => {
      document.documentElement.classList.remove("monopo-rn-cursor-active");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
    };
  }, [mouseX, mouseY, ringOpacity, ringScale, ringX, ringY]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ringX.value - RING / 2 },
      { translateY: ringY.value - RING / 2 },
      { scale: ringScale.value },
    ],
    opacity: ringOpacity.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: mouseX.value - DOT / 2 },
      { translateY: mouseY.value - DOT / 2 },
    ],
  }));

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.root}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={[styles.dot, dotStyle]} />
      {Platform.OS === "web"
        ? createElement("div", {
            "aria-hidden": true,
            style: { display: "none" },
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  ring: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1,
    borderColor: "#fff",
  },
  dot: {
    position: "absolute",
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: "#fff",
  },
});
