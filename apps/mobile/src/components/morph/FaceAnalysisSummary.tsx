import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
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
};

type Metric = {
  key: "face" | "length" | "color";
  label: string;
  detail: string;
  percent: number;
};

const TICK_COUNT = 48;
const ACCENT = "#C026A0";

function toPercent(value: number | undefined, fallback: number): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.max(8, Math.min(100, Math.round(pct)));
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
  const outer = size * 0.42;
  const inner = size * 0.3;
  const activeTicks = Math.max(1, Math.round((percent / 100) * TICK_COUNT));
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
              stroke={on ? ACCENT : "rgba(255,255,255,0.55)"}
              strokeWidth={2.4}
              strokeLinecap="round"
              opacity={on ? 1 : 0.7}
            />
          );
        })}
      </Svg>
      <View style={styles.gaugeCenter} pointerEvents="none">
        <Text style={styles.gaugePct}>{displayPct}%</Text>
      </View>
    </View>
  );
}

function MetricPill({
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
        styles.pill,
        {
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
            {
              scale: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.pillLabel} numberOfLines={2}>
        {metric.label}
      </Text>
      <TickGauge size={86} percent={metric.percent} progress={progress} />
      <Text style={styles.pillDetail} numberOfLines={2}>
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

/**
 * Tahlil reveal — Skin Summary uslubida 3 ta gauge ketma-ket chiziladi,
 * keyin Start Generate.
 */
export function FaceAnalysisSummary({
  analyze,
  onStartGenerate,
  generating = false,
}: Props) {
  const faceProgress = useRef(new Animated.Value(0)).current;
  const lengthProgress = useRef(new Animated.Value(0)).current;
  const colorProgress = useRef(new Animated.Value(0)).current;
  const ctaEnter = useRef(new Animated.Value(0)).current;
  const [visibleCount, setVisibleCount] = useState(0);
  const [ready, setReady] = useState(false);

  const metrics = useMemo<Metric[]>(() => {
    const colorKey = analyze.hair_color || "other";
    return [
      {
        key: "face",
        label: "Yuz",
        detail: faceShapeLabel(analyze.face_shape),
        percent: toPercent(analyze.face_confidence, 0.86),
      },
      {
        key: "length",
        label: "Uzunlik",
        detail: hairTypeLabel(analyze.hair_type),
        percent: toPercent(analyze.hair_type_confidence, 0.78),
      },
      {
        key: "color",
        label: "Rang",
        detail: hairColorLabel(colorKey),
        percent: toPercent(analyze.hair_color_confidence, 0.74),
      },
    ];
  }, [analyze]);

  const progresses = [faceProgress, lengthProgress, colorProgress];

  useEffect(() => {
    let cancelled = false;
    faceProgress.setValue(0);
    lengthProgress.setValue(0);
    colorProgress.setValue(0);
    ctaEnter.setValue(0);
    setVisibleCount(0);
    setReady(false);

    const run = async () => {
      for (let i = 0; i < 3; i += 1) {
        if (cancelled) return;
        setVisibleCount(i + 1);
        await animateTo(progresses[i], 1, 1100);
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 200));
      }
      if (cancelled) return;
      setReady(true);
      Animated.spring(ctaEnter, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
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
    <View style={styles.wrap}>
      <LinearGradient
        colors={["#F7C9A8", "#F3B7C2", "#EFB0C8"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.title}>Skin Summary</Text>
        <Text style={styles.subtitle}>AI yuzingizni tahlil qildi</Text>

        <View style={styles.pillsRow}>
          {metrics.map((metric, index) => (
            <MetricPill
              key={metric.key}
              metric={metric}
              progress={progresses[index]}
              visible={visibleCount > index}
            />
          ))}
        </View>

        <Animated.View
          style={{
            opacity: ctaEnter,
            transform: [
              {
                translateY: ctaEnter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          }}
        >
          <Pressable
            style={[styles.cta, (!ready || generating) && styles.ctaDisabled]}
            disabled={!ready || generating}
            onPress={onStartGenerate}
            accessibilityRole="button"
            accessibilityLabel="Start Generate"
          >
            <View style={styles.ctaIcon}>
              <Ionicons name="scan-outline" size={20} color="#111" />
            </View>
            <Text style={styles.ctaText}>
              {generating ? "Generate…" : "Start Generate"}
            </Text>
            <View style={styles.ctaArrows}>
              {[0, 1, 2, 3].map((i) => (
                <Ionicons
                  key={i}
                  name="chevron-forward"
                  size={14}
                  color={ACCENT}
                  style={{ marginLeft: i === 0 ? 0 : -6, opacity: 0.45 + i * 0.15 }}
                />
              ))}
            </View>
          </Pressable>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: 18,
  },
  card: {
    borderRadius: 36,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: "#C026A0",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(20,20,20,0.55)",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  pill: {
    flex: 1,
    alignItems: "center",
    borderRadius: 999,
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 6,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    gap: 10,
    minHeight: 220,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    minHeight: 32,
  },
  pillDetail: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(20,20,20,0.62)",
    textAlign: "center",
    paddingHorizontal: 2,
    lineHeight: 14,
  },
  gaugeCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugePct: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.3,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#C026A0",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: 12,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  ctaText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  ctaArrows: {
    flexDirection: "row",
    alignItems: "center",
  },
});
