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
const THUMB = 46;
const TRACK_H = 58;
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
  /** Markazdan o‘ng chetigacha › › › › yurishi. */
  const arrowTravel = Math.max(24, trackW * 0.42);

  useEffect(() => {
    if (!enabled || generating) {
      arrowPulse.stopAnimation();
      arrowPulse.setValue(0);
      return;
    }
    arrowPulse.setValue(0);
    const loop = Animated.loop(
      Animated.timing(arrowPulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
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
    outputRange: [0, arrowTravel],
  });
  const arrowOpacity = arrowPulse.interpolate({
    inputRange: [0, 0.15, 0.75, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View
      style={[styles.sliderOuter, (!enabled || generating) && styles.sliderDisabled]}
      onLayout={onTrackLayout}
    >
      <View style={styles.sliderTrack}>
        <Text style={styles.sliderHint} pointerEvents="none">
          {generating ? "Generate…" : enabled ? "Generate" : "…"}
        </Text>

        {enabled && !generating && trackW > 0 ? (
          <Animated.View
            style={[
              styles.sliderArrows,
              {
                opacity: arrowOpacity,
                transform: [{ translateX: arrowShift }],
              },
            ]}
            pointerEvents="none"
          >
            {[0, 1, 2, 3].map((i) => (
              <Ionicons
                key={i}
                name="chevron-forward"
                size={18}
                color={ACCENT}
                style={{ opacity: 0.35 + i * 0.18, marginLeft: i === 0 ? 0 : -6 }}
              />
            ))}
          </Animated.View>
        ) : null}

        <Animated.View
          style={[styles.sliderThumb, { transform: [{ translateX: dragX }] }]}
          {...(enabled && !generating ? pan.panHandlers : {})}
        >
          {generating ? (
            <ActivityIndicator color="#111" size="small" />
          ) : (
            <Ionicons name="sparkles" size={20} color="#111" />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * AI tugagach: 3 ta card ketma-ket + Generate slider.
 */
export function FaceAnalysisSummary({
  analyze,
  onStartGenerate,
  generating = false,
  bottomInset = 16,
}: Props) {
  const [ready, setReady] = useState(false);
  const sliderEnter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setReady(false);
    sliderEnter.stopAnimation();
    sliderEnter.setValue(0);
  }, [
    sliderEnter,
    analyze.face_shape,
    analyze.hair_type,
    analyze.hair_color,
    analyze.face_confidence,
    analyze.hair_type_confidence,
    analyze.hair_color_confidence,
  ]);

  useEffect(() => {
    if (!ready) return;
    Animated.spring(sliderEnter, {
      toValue: 1,
      friction: 8,
      tension: 55,
      useNativeDriver: true,
    }).start();
  }, [ready, sliderEnter]);

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 14) }]}>
      <FaceAnalysisRing
        analyze={analyze}
        sequential
        compact
        tone="onLight"
        onRevealComplete={() => setReady(true)}
      />
      {ready ? (
        <Animated.View
          style={[
            styles.sliderWrap,
            {
              opacity: sliderEnter,
              transform: [
                {
                  translateY: sliderEnter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
                {
                  scale: sliderEnter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <GenerateSlider
            enabled
            generating={generating}
            onComplete={onStartGenerate}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /** YUZ…Generate oralig‘i — oq panel, rasm ichida width/height. */
  sheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 16,
    gap: 16,
  },
  sliderWrap: {
    borderRadius: 999,
    width: "100%",
  },
  sliderOuter: {
    borderRadius: 999,
    width: "100%",
  },
  sliderTrack: {
    height: TRACK_H,
    borderRadius: 999,
    backgroundColor: "#F3F3F3",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    overflow: "hidden",
  },
  sliderDisabled: {
    opacity: 0.7,
  },
  sliderHint: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0A0A",
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  sliderArrows: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderThumb: {
    position: "absolute",
    left: 6,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
