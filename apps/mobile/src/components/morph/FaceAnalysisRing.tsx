import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import type { AiStyleAnalyzeResponse } from "../../api/ai";
import {
  faceShapeLabel,
  HAIR_COLOR_HEX,
  hairColorLabel,
  hairTypeLabel,
} from "../../lib/morph-labels";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  analyze: AiStyleAnalyzeResponse;
  size?: number;
};

type RingMetric = {
  key: string;
  label: string;
  detail: string;
  percent: number;
  color: string;
  track: string;
};

function toPercent(value: number | undefined, fallback: number): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.max(8, Math.min(100, Math.round(pct)));
}

function ProgressRing({
  cx,
  cy,
  radius,
  strokeWidth,
  color,
  track,
  percent,
  progress,
}: {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  color: string;
  track: string;
  percent: number;
  progress: Animated.Value;
}) {
  const circumference = 2 * Math.PI * radius;
  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - percent / 100)],
  });

  return (
    <G rotation="-90" origin={`${cx}, ${cy}`}>
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={track}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
      />
    </G>
  );
}

/**
 * Asl selfie tahlili — rangdor concentric activity rings (foiz bilan).
 */
export function FaceAnalysisRing({ analyze, size = 168 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  const rings = useMemo<RingMetric[]>(() => {
    const colorKey = analyze.hair_color || "other";
    const hairHex = analyze.hair_color_hex || HAIR_COLOR_HEX[colorKey] || "#5C5C5C";
    return [
      {
        key: "face",
        label: "Yuz shakli",
        detail: faceShapeLabel(analyze.face_shape),
        percent: toPercent(analyze.face_confidence, 0.86),
        color: "#F5C518",
        track: "rgba(245,197,24,0.18)",
      },
      {
        key: "length",
        label: "Soch uzunligi",
        detail: hairTypeLabel(analyze.hair_type),
        percent: toPercent(analyze.hair_type_confidence, 0.78),
        color: "#5B8CFF",
        track: "rgba(91,140,255,0.18)",
      },
      {
        key: "color",
        label: "Soch rangi",
        detail: hairColorLabel(colorKey),
        percent: toPercent(analyze.hair_color_confidence, 0.74),
        color: hairHex === "#1A1A1A" ? "#FF6B9D" : hairHex,
        track: "rgba(255,107,157,0.16)",
      },
    ];
  }, [analyze]);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [analyze.face_shape, analyze.hair_type, analyze.hair_color, progress]);

  const cx = size / 2;
  const cy = size / 2;
  const stroke = 12;
  const gap = 8;
  const radii = [size * 0.42, size * 0.42 - (stroke + gap), size * 0.42 - 2 * (stroke + gap)];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Sizning tahlilingiz</Text>
      <Text style={styles.sub}>Asl selfie holati — aniqlik foizi</Text>

      <View style={styles.row}>
        <View style={styles.legend}>
          {rings.map((ring) => (
            <View key={ring.key} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: ring.color }]} />
              <View style={styles.legendCopy}>
                <Text style={styles.legendLabel}>{ring.label}</Text>
                <Text style={styles.legendDetail} numberOfLines={1}>
                  {ring.detail}
                </Text>
              </View>
              <Text style={[styles.legendPct, { color: ring.color }]}>{ring.percent}%</Text>
            </View>
          ))}
        </View>

        <View style={[styles.ringBox, { width: size, height: size }]}>
          <Svg width={size} height={size}>
            {rings.map((ring, i) => (
              <ProgressRing
                key={ring.key}
                cx={cx}
                cy={cy}
                radius={radii[i] ?? radii[0]}
                strokeWidth={stroke}
                color={ring.color}
                track={ring.track}
                percent={ring.percent}
                progress={progress}
              />
            ))}
          </Svg>
          <View style={styles.centerLabel} pointerEvents="none">
            <Text style={styles.centerEyebrow}>PROGRESS</Text>
            <Text style={styles.centerValue}>Selfie{"\n"}profil</Text>
          </View>
        </View>
      </View>

      {analyze.summary_uz ? (
        <Text style={styles.summary} numberOfLines={3}>
          {analyze.summary_uz}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: -8,
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legend: {
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendCopy: { flex: 1, minWidth: 0 },
  legendLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0A0A0A",
  },
  legendDetail: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 1,
  },
  legendPct: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  ringBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  centerEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#A3A3A3",
    marginBottom: 4,
  },
  centerValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0A0A0A",
    textAlign: "center",
    lineHeight: 16,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    color: "#525252",
  },
});
