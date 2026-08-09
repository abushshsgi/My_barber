import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
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
  key: "face" | "length" | "color";
  label: string;
  detail: string;
  percent: number;
  color: string;
  track: string;
  faceShape?: string;
  hairType?: string;
  hairHex?: string;
};

function toPercent(value: number | undefined, fallback: number): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.max(8, Math.min(100, Math.round(pct)));
}

function FaceShapeGlyph({ shape, color }: { shape: string; color: string }) {
  if (shape === "round") {
    return <Circle cx={14} cy={14} r={9} fill={color} />;
  }
  if (shape === "square") {
    return <Rect x={5} y={5} width={18} height={18} rx={4} fill={color} />;
  }
  return <Ellipse cx={14} cy={14} rx={8} ry={10} fill={color} />;
}

function HairLengthGlyph({ length, color }: { length: string; color: string }) {
  const h =
    length === "long" ? [8, 12, 16] : length === "medium" ? [7, 10, 12] : [5, 7, 9];
  return (
    <G>
      <Path d={`M8 8 Q10 ${8 + h[0]} 8 ${8 + h[0] + 2}`} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d={`M14 6 Q16 ${6 + h[1]} 14 ${6 + h[1] + 2}`} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d={`M20 8 Q22 ${8 + h[2]} 20 ${8 + h[2] + 2}`} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </G>
  );
}

function HairColorGlyph({ hex }: { hex: string }) {
  return (
    <G>
      <Circle cx={14} cy={14} r={9} fill={hex} />
      <Circle cx={14} cy={14} r={9} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} fill="none" />
      <Circle cx={18} cy={10} r={3.2} fill="#FFF" opacity={0.9} />
    </G>
  );
}

function TraitIcon({ metric }: { metric: RingMetric }) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: `${metric.color}22` }]}>
      <Svg width={28} height={28} viewBox="0 0 28 28">
        {metric.key === "face" ? (
          <FaceShapeGlyph shape={metric.faceShape || "oval"} color={metric.color} />
        ) : null}
        {metric.key === "length" ? (
          <HairLengthGlyph length={metric.hairType || "short"} color={metric.color} />
        ) : null}
        {metric.key === "color" ? (
          <HairColorGlyph hex={metric.hairHex || metric.color} />
        ) : null}
      </Svg>
    </View>
  );
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
 * Asl selfie tahlili — kartochka + ikonka/shakllar + concentric rings.
 */
export function FaceAnalysisRing({ analyze, size = 158 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  const rings = useMemo<RingMetric[]>(() => {
    const colorKey = analyze.hair_color || "other";
    const hairHex = analyze.hair_color_hex || HAIR_COLOR_HEX[colorKey] || "#5C5C5C";
    const ringColor = hairHex === "#1A1A1A" ? "#FF6B9D" : hairHex;
    return [
      {
        key: "face",
        label: "Yuz shakli",
        detail: faceShapeLabel(analyze.face_shape),
        percent: toPercent(analyze.face_confidence, 0.86),
        color: "#F5C518",
        track: "rgba(245,197,24,0.18)",
        faceShape: analyze.face_shape,
      },
      {
        key: "length",
        label: "Soch uzunligi",
        detail: hairTypeLabel(analyze.hair_type),
        percent: toPercent(analyze.hair_type_confidence, 0.78),
        color: "#5B8CFF",
        track: "rgba(91,140,255,0.18)",
        hairType: analyze.hair_type,
      },
      {
        key: "color",
        label: "Soch rangi",
        detail: hairColorLabel(colorKey),
        percent: toPercent(analyze.hair_color_confidence, 0.74),
        color: ringColor,
        track: "rgba(255,107,157,0.16)",
        hairHex,
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
  const stroke = 11;
  const gap = 7;
  const radii = [size * 0.42, size * 0.42 - (stroke + gap), size * 0.42 - 2 * (stroke + gap)];

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadIcon}>
          <Ionicons name="analytics-outline" size={16} color="#0A0A0A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sizning tahlilingiz</Text>
          <Text style={styles.sub}>Asl selfie holati — aniqlik foizi</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.legend}>
          {rings.map((ring) => (
            <View key={ring.key} style={styles.traitCard}>
              <TraitIcon metric={ring} />
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
        <View style={styles.summaryBox}>
          <Text style={styles.summary} numberOfLines={3}>
            {analyze.summary_uz}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardHeadIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legend: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  traitCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F7F7F8",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
    paddingRight: 2,
  },
  ringBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
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
  summaryBox: {
    backgroundColor: "#F7F7F8",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    color: "#525252",
  },
});
