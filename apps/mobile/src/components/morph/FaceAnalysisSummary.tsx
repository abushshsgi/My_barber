import { Ionicons } from "@expo/vector-icons";
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
  bottomInset?: number;
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
              opacity={on ? 1 : 0.75}
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
                outputRange: [16, 0],
              }),
            },
            {
              scale: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.pillLabel} numberOfLines={1}>
        {metric.label}
      </Text>
      <TickGauge size={78} percent={metric.percent} progress={progress} />
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
 * Pastdagi glass card: 3 ta aylana ketma-ket, keyin Generate.
 * Yuz ustiga hech narsa chizilmaydi.
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
    setVisibleCount(0);
    setReady(false);

    const run = async () => {
      for (let i = 0; i < 3; i += 1) {
        if (cancelled) return;
        setVisibleCount(i + 1);
        await animateTo(progresses[i], 1, 1000);
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 180));
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
    <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.card}>
        <Text style={styles.title}>Morf tahlil</Text>
        <Text style={styles.subtitle}>
          {ready ? "Yuz tahlili tayyor" : "Yuz tahlil qilinmoqda…"}
        </Text>

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

        <Pressable
          style={[styles.cta, (!ready || generating) && styles.ctaBusy]}
          disabled={!ready || generating}
          onPress={onStartGenerate}
          accessibilityRole="button"
          accessibilityLabel={ready ? "Generate" : "Tahlil qilinmoqda"}
        >
          <View style={styles.ctaIcon}>
            {ready && !generating ? (
              <Ionicons name="sparkles" size={18} color="#111" />
            ) : (
              <Ionicons name="scan-outline" size={18} color="#111" />
            )}
          </View>
          <Text style={styles.ctaText}>
            {generating ? "Generate…" : ready ? "Generate" : "Tahlil qilinmoqda…"}
          </Text>
          <View style={styles.ctaArrows}>
            {[0, 1, 2, 3].map((i) => (
              <Ionicons
                key={i}
                name="chevron-forward"
                size={14}
                color={ACCENT}
                style={{ marginLeft: i === 0 ? 0 : -6, opacity: ready ? 0.45 + i * 0.15 : 0.25 }}
              />
            ))}
          </View>
        </Pressable>
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
    borderRadius: 34,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.22)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 14,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(10,10,10,0.58)",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    flex: 1,
    alignItems: "center",
    borderRadius: 999,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.34)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: 8,
    minHeight: 188,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0A0A0A",
    textAlign: "center",
  },
  pillDetail: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(10,10,10,0.62)",
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
    fontSize: 15,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.3,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 9,
    paddingLeft: 9,
    paddingRight: 14,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    gap: 10,
  },
  ctaBusy: {
    opacity: 0.85,
  },
  ctaIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ctaText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0A0A0A",
  },
  ctaArrows: {
    flexDirection: "row",
    alignItems: "center",
  },
});
