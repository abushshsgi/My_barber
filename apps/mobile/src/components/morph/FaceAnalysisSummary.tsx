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
import Svg, { Line } from "react-native-svg";
import type { AiStyleAnalyzeResponse } from "../../api/ai";
import {
  faceShapeLabel,
  hairColorLabel,
  hairTypeLabel,
} from "../../lib/morph-labels";

type Props = {
  analyze: AiStyleAnalyzeResponse;
  onStartGenerate: () => void;
  generating?: boolean;
  bottomInset?: number;
};

type Metric = {
  key: "face" | "length" | "color";
  label: string;
  detail: string;
  percent: number;
};

const TICK_COUNT = 40;
const ACCENT = "#C026A0";
const CIRCLE = 92;
const THUMB = 40;
const SLIDE_THRESHOLD = 0.82;

function toPercent(value: number | undefined, fallback: number): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.max(1, Math.min(100, Math.round(pct)));
}

function TickGauge({
  size,
  percent,
  progress,
}: {
  size: number;
  percent: number;
  progress: Animated.Value;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.44;
  const inner = size * 0.32;
  const activeTicks = Math.max(0, Math.round((percent / 100) * TICK_COUNT));
  const [drawn, setDrawn] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      setDrawn(Math.round(value * activeTicks));
      setDisplayPct(Math.round(value * percent));
    });
    return () => progress.removeListener(id);
  }, [activeTicks, percent, progress]);

  const ticks = useMemo(() => {
    return Array.from({ length: TICK_COUNT }, (_, i) => {
      const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x1: cx + cos * inner,
        y1: cy + sin * inner,
        x2: cx + cos * outer,
        y2: cy + sin * outer,
      };
    });
  }, [cx, cy, inner, outer]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {ticks.map((tick, i) => {
          const on = i < drawn;
          return (
            <Line
              key={i}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={on ? ACCENT : "rgba(0,0,0,0.14)"}
              strokeWidth={2.2}
              strokeLinecap="round"
              opacity={on ? 1 : 0.85}
            />
          );
        })}
      </Svg>
      <View style={styles.gaugeCenter} pointerEvents="none">
        <Text style={styles.gaugePct}>{displayPct}</Text>
        <Text style={styles.gaugePctUnit}>%</Text>
      </View>
    </View>
  );
}

function MetricCircle({
  metric,
  progress,
  visible,
}: {
  metric: Metric;
  progress: Animated.Value;
  visible: boolean;
}) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      return;
    }
    Animated.spring(enter, {
      toValue: 1,
      friction: 8,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [enter, visible]);

  return (
    <Animated.View
      style={[
        styles.metricCol,
        {
          opacity: enter,
          transform: [
            {
              scale: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [0.88, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.metricLabel} numberOfLines={1}>
        {metric.label}
      </Text>
      <View style={styles.circle}>
        <TickGauge size={CIRCLE - 10} percent={metric.percent} progress={progress} />
      </View>
      <Text style={styles.metricDetail} numberOfLines={1}>
        {metric.detail}
      </Text>
    </Animated.View>
  );
}

function animateTo(value: Animated.Value, toValue: number, duration: number) {
  return new Promise<void>((resolve) => {
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => resolve());
  });
}

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
 * Ixcham glass card: 3 ta aylana + suriladigan Generate.
 */
export function FaceAnalysisSummary({
  analyze,
  onStartGenerate,
  generating = false,
  bottomInset = 16,
}: Props) {
  const faceProgress = useRef(new Animated.Value(0)).current;
  const lengthProgress = useRef(new Animated.Value(0)).current;
  const colorProgress = useRef(new Animated.Value(0)).current;
  const [visibleCount, setVisibleCount] = useState(0);
  const [ready, setReady] = useState(false);

  const metrics = useMemo<Metric[]>(() => {
    const colorKey = analyze.hair_color || "other";
    return [
      {
        key: "face",
        label: "Yuz",
        detail: faceShapeLabel(analyze.face_shape),
        percent: toPercent(analyze.face_confidence, 0.74),
      },
      {
        key: "length",
        label: "Uzunlik",
        detail: hairTypeLabel(analyze.hair_type),
        percent: toPercent(analyze.hair_type_confidence, 0.7),
      },
      {
        key: "color",
        label: "Rang",
        detail: hairColorLabel(colorKey),
        percent: toPercent(analyze.hair_color_confidence, 0.68),
      },
    ];
  }, [analyze]);

  const progresses = [faceProgress, lengthProgress, colorProgress];

  useEffect(() => {
    let cancelled = false;
    faceProgress.setValue(0);
    lengthProgress.setValue(0);
    colorProgress.setValue(0);
    setVisibleCount(0);
    setReady(false);

    const run = async () => {
      for (let i = 0; i < 3; i += 1) {
        if (cancelled) return;
        setVisibleCount(i + 1);
        await animateTo(progresses[i], 1, 900);
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 140));
      }
      if (!cancelled) setReady(true);
    };
    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <View style={styles.card}>
        <View style={styles.row}>
          {metrics.map((metric, index) => (
            <MetricCircle
              key={metric.key}
              metric={metric}
              progress={progresses[index]}
              visible={visibleCount > index}
            />
          ))}
        </View>

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
  },
  card: {
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.22)",
    shadowColor: "#000",
    shadowOpacity: 0.26,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0A0A0A",
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  metricDetail: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(10,10,10,0.62)",
    textAlign: "center",
    maxWidth: CIRCLE + 8,
  },
  gaugeCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  gaugePct: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.4,
  },
  gaugePctUnit: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(10,10,10,0.55)",
    marginTop: 4,
    marginLeft: 1,
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
