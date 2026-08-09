import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import type { AiStyleAnalyzeResponse } from "../../api/ai";
import {
  faceShapeLabel,
  hairColorLabel,
  hairTextureLabel,
  hairTypeLabel,
} from "../../lib/morph-labels";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  analyze: AiStyleAnalyzeResponse;
};

type MetricCard = {
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

function MiniProgressRing({
  percent,
  color,
  track,
  progress,
  size = 52,
  strokeWidth = 4.5,
}: {
  percent: number;
  color: string;
  track: string;
  progress: Animated.Value;
  size?: number;
  strokeWidth?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - percent / 100)],
  });

  return (
    <Svg width={size} height={size}>
      {/* Web: `origin` → invalid `transform-origin`; SVG transform ishlatiladi. */}
      <G transform={`rotate(-90 ${cx} ${cy})`}>
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
    </Svg>
  );
}

/**
 * Selfie tahlili — 2×2 glass card + mini progress ring (dizayn referens).
 */
export function FaceAnalysisRing({ analyze }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  const cards = useMemo<MetricCard[]>(() => {
    const colorKey = analyze.hair_color || "other";
    const textureKey = analyze.hair_texture || "straight";
    const texturePct = toPercent(
      ((analyze.face_confidence ?? 0.86) +
        (analyze.hair_type_confidence ?? 0.78) +
        (analyze.hair_color_confidence ?? 0.74)) /
        3,
      0.7,
    );

    return [
      {
        key: "face",
        label: "Yuz",
        detail: faceShapeLabel(analyze.face_shape),
        percent: toPercent(analyze.face_confidence, 0.86),
        color: "#FF4D8D",
        track: "rgba(255,77,141,0.18)",
      },
      {
        key: "length",
        label: "Uzunlik",
        detail: hairTypeLabel(analyze.hair_type),
        percent: toPercent(analyze.hair_type_confidence, 0.78),
        color: "#4C8DF5",
        track: "rgba(76,141,245,0.18)",
      },
      {
        key: "texture",
        label: "Tekstura",
        detail: hairTextureLabel(textureKey),
        percent: texturePct,
        color: "#2ECC71",
        track: "rgba(46,204,113,0.18)",
      },
      {
        key: "color",
        label: "Rang",
        detail: hairColorLabel(colorKey),
        percent: toPercent(analyze.hair_color_confidence, 0.74),
        color: "#FF7A59",
        track: "rgba(255,122,89,0.18)",
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
  }, [
    analyze.face_shape,
    analyze.hair_type,
    analyze.hair_color,
    analyze.hair_texture,
    progress,
  ]);

  return (
    <View style={styles.shell}>
      <View style={styles.grid}>
        {cards.map((card) => (
          <View
            key={card.key}
            style={styles.card}
            accessibilityLabel={`${card.label}: ${card.detail}, ${card.percent} foiz`}
          >
            <View style={styles.cardCopy}>
              <Text style={styles.cardLabel} numberOfLines={1}>
                {card.label}
              </Text>
              <Text style={styles.cardPct}>{card.percent}%</Text>
            </View>
            <MiniProgressRing
              percent={card.percent}
              color={card.color}
              track={card.track}
              progress={progress}
            />
          </View>
        ))}
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
  shell: {
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    // Glass lift over blurred selfie
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    flexBasis: "47%",
    flexGrow: 1,
    maxWidth: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.98)",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingVertical: 2,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  cardPct: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.5,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(20,20,20,0.72)",
    paddingHorizontal: 4,
  },
});
