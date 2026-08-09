import { useEffect, useMemo, useRef, useState } from "react";
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
  /** Natija — haqiqiy foizlar. Loadingda ixtiyoriy. */
  analyze?: AiStyleAnalyzeResponse | null;
  /** Tahlil jarayoni — pulse + aylanuvchi progress. */
  loading?: boolean;
  /** Summary matnini yashirish (pastdagi Generate uchun). */
  compact?: boolean;
};

type MetricCard = {
  key: string;
  label: string;
  detail: string;
  percent: number;
  color: string;
  track: string;
};

const PLACEHOLDER_CARDS: MetricCard[] = [
  {
    key: "face",
    label: "Yuz",
    detail: "…",
    percent: 62,
    color: "#FF4D8D",
    track: "#F0E4EA",
  },
  {
    key: "length",
    label: "Uzunlik",
    detail: "…",
    percent: 48,
    color: "#6B8CFF",
    track: "#E4E8F5",
  },
  {
    key: "texture",
    label: "Tekstura",
    detail: "…",
    percent: 36,
    color: "#3DCC7A",
    track: "#E0F2E8",
  },
  {
    key: "color",
    label: "Rang",
    detail: "…",
    percent: 54,
    color: "#FF7A59",
    track: "#F5E6E2",
  },
];

function toPercent(value: number | undefined, fallback: number): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.max(8, Math.min(100, Math.round(pct)));
}

function cardsFromAnalyze(analyze: AiStyleAnalyzeResponse): MetricCard[] {
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
      track: "#F0E4EA",
    },
    {
      key: "length",
      label: "Uzunlik",
      detail: hairTypeLabel(analyze.hair_type),
      percent: toPercent(analyze.hair_type_confidence, 0.78),
      color: "#6B8CFF",
      track: "#E4E8F5",
    },
    {
      key: "texture",
      label: "Tekstura",
      detail: hairTextureLabel(textureKey),
      percent: texturePct,
      color: "#3DCC7A",
      track: "#E0F2E8",
    },
    {
      key: "color",
      label: "Rang",
      detail: hairColorLabel(colorKey),
      percent: toPercent(analyze.hair_color_confidence, 0.74),
      color: "#FF7A59",
      track: "#F5E6E2",
    },
  ];
}

function MiniProgressRing({
  percent,
  color,
  track,
  progress,
  size = 46,
  strokeWidth = 3.5,
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

  const ring = (
    <Svg width={size} height={size}>
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

  return ring;
}

function MetricTile({
  card,
  progress,
  displayPercent,
  enter,
  loading,
}: {
  card: MetricCard;
  progress: Animated.Value;
  displayPercent: number;
  enter: Animated.Value;
  loading: boolean;
}) {
  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
            {
              scale: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            },
          ],
        },
      ]}
      accessibilityLabel={`${card.label}: ${card.detail}, ${displayPercent} foiz`}
    >
      <View style={styles.cardCopy}>
        <Text style={styles.cardLabel} numberOfLines={1}>
          {card.label}
        </Text>
        <Text style={[styles.cardPct, loading && styles.cardPctLoading]}>
          {displayPercent}%
        </Text>
        {!loading && card.detail && card.detail !== "…" ? (
          <Text style={styles.cardDetail} numberOfLines={1}>
            {card.detail}
          </Text>
        ) : null}
      </View>
      <MiniProgressRing
        percent={card.percent}
        color={card.color}
        track={card.track}
        progress={progress}
      />
    </Animated.View>
  );
}

/**
 * Selfie tahlili — 2×2 glass card (dizayn referens).
 * `loading` — tahlil animatsiyasi; natija — haqiqiy foizlar.
 */
export function FaceAnalysisRing({
  analyze = null,
  loading = false,
  compact = false,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const enters = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const [displayPcts, setDisplayPcts] = useState([0, 0, 0, 0]);

  const cards = useMemo(
    () => (analyze && !loading ? cardsFromAnalyze(analyze) : PLACEHOLDER_CARDS),
    [analyze, loading],
  );

  useEffect(() => {
    enters.forEach((v) => v.setValue(0));
    Animated.stagger(
      90,
      enters.map((v) =>
        Animated.spring(v, {
          toValue: 1,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [enters, loading, analyze?.face_shape, analyze?.hair_type]);

  useEffect(() => {
    progress.stopAnimation();
    pulse.stopAnimation();
    progress.setValue(0);
    pulse.setValue(0);

    if (loading) {
      const fillLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(progress, {
            toValue: 0.22,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      );
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      );
      fillLoop.start();
      pulseLoop.start();

      const id = pulse.addListener(({ value }) => {
        setDisplayPcts(
          cards.map((c, i) => {
            const base = 18 + ((i * 11) % 20);
            const swing = Math.round(value * (c.percent * 0.45));
            return Math.min(99, base + swing);
          }),
        );
      });

      return () => {
        fillLoop.stop();
        pulseLoop.stop();
        pulse.removeListener(id);
      };
    }

    setDisplayPcts(cards.map((c) => c.percent));
    Animated.timing(progress, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const id = progress.addListener(({ value }) => {
      setDisplayPcts(cards.map((c) => Math.round(value * c.percent)));
    });
    return () => progress.removeListener(id);
  }, [
    loading,
    cards,
    progress,
    pulse,
    analyze?.face_confidence,
    analyze?.hair_type_confidence,
    analyze?.hair_color_confidence,
  ]);

  return (
    <View style={styles.shell}>
      <View style={styles.grid}>
        {cards.map((card, index) => (
          <MetricTile
            key={card.key}
            card={card}
            progress={progress}
            displayPercent={displayPcts[index] ?? 0}
            enter={enters[index]}
            loading={loading}
          />
        ))}
      </View>
      {loading ? (
        <Text style={styles.loadingHint}>Tahlil qilinmoqda…</Text>
      ) : !compact && analyze?.summary_uz ? (
        <Text style={styles.summary} numberOfLines={3}>
          {analyze.summary_uz}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    backgroundColor: "rgba(255,255,255,0.32)",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
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
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8A8A8A",
  },
  cardPct: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.4,
  },
  cardPctLoading: {
    color: "#333333",
  },
  cardDetail: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(17,17,17,0.45)",
    marginTop: 1,
  },
  loadingHint: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(20,20,20,0.62)",
    textAlign: "center",
    paddingTop: 2,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(20,20,20,0.72)",
    paddingHorizontal: 4,
  },
});
