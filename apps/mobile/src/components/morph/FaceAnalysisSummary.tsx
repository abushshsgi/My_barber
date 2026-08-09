import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { AiStyleAnalyzeResponse } from "../../api/ai";
import { FaceAnalysisRing } from "./FaceAnalysisRing";

type Props = {
  analyze: AiStyleAnalyzeResponse;
  onStartGenerate: () => void;
  generating?: boolean;
  bottomInset?: number;
};

const ACCENT = "#C026A0";
const THUMB = 40;
const SLIDE_THRESHOLD = 0.82;

function GenerateSlider({
  enabled,
  generating,
  onComplete,
}: {
  enabled: boolean;
  generating: boolean;
  onComplete: () => void;
}) {
  const [trackW, setTrackW] = useState(0);
  const dragX = useRef(new Animated.Value(0)).current;
  const arrowPulse = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);
  const maxTravel = Math.max(0, trackW - THUMB - 8);

  useEffect(() => {
    if (!enabled || generating) {
      arrowPulse.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(arrowPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [arrowPulse, enabled, generating]);

  useEffect(() => {
    if (!enabled) {
      doneRef.current = false;
      dragX.setValue(0);
    }
  }, [dragX, enabled]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabled && !generating && !doneRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
          enabled && !generating && !doneRef.current && Math.abs(g.dx) > 4,
        onPanResponderGrant: () => {
          dragX.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          if (!enabled || generating || doneRef.current) return;
          const next = Math.max(0, Math.min(maxTravel, g.dx));
          dragX.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          if (!enabled || generating || doneRef.current) return;
          const next = Math.max(0, Math.min(maxTravel, g.dx));
          const ratio = maxTravel > 0 ? next / maxTravel : 0;
          if (ratio >= SLIDE_THRESHOLD) {
            doneRef.current = true;
            Animated.timing(dragX, {
              toValue: maxTravel,
              duration: 140,
              useNativeDriver: false,
            }).start(() => onComplete());
            return;
          }
          Animated.spring(dragX, {
            toValue: 0,
            friction: 7,
            tension: 80,
            useNativeDriver: false,
          }).start();
        },
      }),
    [dragX, enabled, generating, maxTravel, onComplete],
  );

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackW(e.nativeEvent.layout.width);
  };

  const arrowShift = arrowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  return (
    <View
      style={[styles.sliderTrack, (!enabled || generating) && styles.sliderDisabled]}
      onLayout={onTrackLayout}
    >
      <Text style={styles.sliderHint} pointerEvents="none">
        {generating ? "Generate…" : enabled ? "Generate" : "…"}
      </Text>

      <Animated.View
        style={[styles.sliderArrows, { transform: [{ translateX: arrowShift }] }]}
        pointerEvents="none"
      >
        {[0, 1, 2, 3].map((i) => (
          <Text
            key={i}
            style={[styles.sliderChevron, { opacity: 0.35 + i * 0.15 }]}
          >
            ›
          </Text>
        ))}
      </Animated.View>

      <Animated.View
        style={[styles.sliderThumb, { transform: [{ translateX: dragX }] }]}
        {...(enabled && !generating ? pan.panHandlers : {})}
      >
        {generating ? (
          <ActivityIndicator color="#111" size="small" />
        ) : (
          <Ionicons name="sparkles" size={18} color="#111" />
        )}
      </Animated.View>
    </View>
  );
}

/**
 * Natija oldidagi card — rasmdek 2×2 ring + Generate slider.
 */
export function FaceAnalysisSummary({
  analyze,
  onStartGenerate,
  generating = false,
  bottomInset = 16,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(t);
  }, [
    analyze.face_shape,
    analyze.hair_type,
    analyze.hair_color,
    analyze.face_confidence,
    analyze.hair_type_confidence,
    analyze.hair_color_confidence,
  ]);

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <FaceAnalysisRing analyze={analyze} compact />
      <View style={styles.sliderWrap}>
        <GenerateSlider
          enabled={ready}
          generating={generating}
          onComplete={onStartGenerate}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: "100%",
    paddingHorizontal: 14,
    gap: 10,
  },
  sliderWrap: {
    borderRadius: 999,
  },
  sliderTrack: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.36)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sliderDisabled: {
    opacity: 0.7,
  },
  sliderHint: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#0A0A0A",
  },
  sliderArrows: {
    position: "absolute",
    right: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  sliderChevron: {
    fontSize: 22,
    fontWeight: "700",
    color: ACCENT,
    marginLeft: -4,
    lineHeight: 24,
  },
  sliderThumb: {
    position: "absolute",
    left: 4,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
