import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import type { AiStyleAnalyzeResponse } from "../../api/ai";
import {
  faceShapeLabel,
  hairColorLabel,
  hairTypeLabel,
} from "../../lib/morph-labels";

type Props = {
  analyze?: AiStyleAnalyzeResponse | null;
  /** AI hali ishlayapti — faqat kutish, card yo‘q. */
  loading?: boolean;
  /** AI tugagach: Yuz → Uzunlik → Rang ketma-ket. */
  sequential?: boolean;
  /** Ketma-ket animatsiya tugaganda. */
  onRevealComplete?: () => void;
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

function toPercent(value: number | undefined, fallback: number): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.max(8, Math.min(100, Math.round(pct)));
}

/** Faqat 3 ta: Yuz, Uzunlik, Rang. */
function cardsFromAnalyze(analyze: AiStyleAnalyzeResponse): MetricCard[] {
  const colorKey = analyze.hair_color || "other";
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
  fill,
  size = 46,
  strokeWidth = 3.5,
}: {
  percent: number;
  color: string;
  track: string;
  /** 0–1 */
  fill: number;
  size?: number;
  strokeWidth?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - (fill * percent) / 100);

  return (
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
        <Circle
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

function MetricTile({
  card,
  fill,
  displayPercent,
  enter,
}: {
  card: MetricCard;
  fill: number;
  displayPercent: number;
  enter: Animated.Value;
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
      accessibilityLabel={`${card.label}: ${card.detail}, ${displayPercent} foiz`}
    >
      <View style={styles.cardCopy}>
        <Text style={styles.cardLabel} numberOfLines={1}>
          {card.label}
        </Text>
        <Text style={styles.cardPct}>{displayPercent}%</Text>
        {card.detail ? (
          <Text style={styles.cardDetail} numberOfLines={1}>
            {card.detail}
          </Text>
        ) : null}
      </View>
      <MiniProgressRing
        percent={card.percent}
        color={card.color}
        track={card.track}
        fill={fill}
      />
    </Animated.View>
  );
}

function springIn(value: Animated.Value) {
  return new Promise<void>((resolve) => {
    Animated.spring(value, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start(() => resolve());
  });
}

function tweenFill(
  from: number,
  to: number,
  duration: number,
  onFrame: (v: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      onFrame(from + (to - from) * eased);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

/**
 * AI kutish yoki 3 ta metrika (Yuz → Uzunlik → Rang).
 */
export function FaceAnalysisRing({
  analyze = null,
  loading = false,
  sequential = false,
  onRevealComplete,
  compact = false,
}: Props) {
  const enters = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const [fills, setFills] = useState([0, 0, 0]);
  const [displayPcts, setDisplayPcts] = useState([0, 0, 0]);
  const [visibleCount, setVisibleCount] = useState(0);
  const onDoneRef = useRef(onRevealComplete);
  onDoneRef.current = onRevealComplete;

  const cards = useMemo(
    () => (analyze ? cardsFromAnalyze(analyze) : []),
    [analyze],
  );

  useEffect(() => {
    if (loading || !analyze || cards.length === 0) {
      setVisibleCount(0);
      setFills([0, 0, 0]);
      setDisplayPcts([0, 0, 0]);
      enters.forEach((e) => {
        e.stopAnimation();
        e.setValue(0);
      });
      return;
    }

    let cancelled = false;

    const reset = () => {
      enters.forEach((e) => {
        e.stopAnimation();
        e.setValue(0);
      });
      setFills([0, 0, 0]);
      setDisplayPcts([0, 0, 0]);
      setVisibleCount(0);
    };

    reset();

    const runSequential = async () => {
      for (let i = 0; i < cards.length; i += 1) {
        if (cancelled) return;
        setVisibleCount(i + 1);
        const card = cards[i];
        await springIn(enters[i]);
        if (cancelled) return;
        await tweenFill(0, 1, 900, (v) => {
          if (cancelled) return;
          setFills((prev) => {
            const next = [...prev];
            next[i] = v;
            return next;
          });
          setDisplayPcts((prev) => {
            const next = [...prev];
            next[i] = Math.round(v * card.percent);
            return next;
          });
        });
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 220));
      }
      if (!cancelled) onDoneRef.current?.();
    };

    const runStatic = async () => {
      setVisibleCount(cards.length);
      enters.forEach((e) => e.setValue(1));
      setFills(cards.map(() => 0));
      setDisplayPcts(cards.map(() => 0));
      await Promise.all(
        cards.map((card, i) =>
          tweenFill(0, 1, 900, (v) => {
            if (cancelled) return;
            setFills((prev) => {
              const next = [...prev];
              next[i] = v;
              return next;
            });
            setDisplayPcts((prev) => {
              const next = [...prev];
              next[i] = Math.round(v * card.percent);
              return next;
            });
          }),
        ),
      );
      if (!cancelled) onDoneRef.current?.();
    };

    if (sequential) {
      void runSequential();
    } else {
      void runStatic();
    }

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    sequential,
    analyze,
    cards,
    enters,
    analyze?.face_shape,
    analyze?.hair_type,
    analyze?.hair_color,
    analyze?.face_confidence,
    analyze?.hair_type_confidence,
    analyze?.hair_color_confidence,
  ]);

  if (loading) {
    return (
      <View style={styles.shell}>
        <View style={styles.waitingBox}>
          <View style={styles.waitingDotRow}>
            <View style={[styles.waitingDot, { backgroundColor: "#FF4D8D" }]} />
            <View style={[styles.waitingDot, { backgroundColor: "#6B8CFF" }]} />
            <View style={[styles.waitingDot, { backgroundColor: "#FF7A59" }]} />
          </View>
          <Text style={styles.loadingHint}>Yuz topilmoqda, AI tahlil qilmoqda…</Text>
        </View>
      </View>
    );
  }

  if (!analyze || cards.length === 0) return null;

  const shown = cards.slice(0, visibleCount);

  return (
    <View style={styles.shell}>
      <View style={styles.grid}>
        {shown.map((card, index) => (
          <MetricTile
            key={card.key}
            card={card}
            fill={fills[index] ?? 0}
            displayPercent={displayPcts[index] ?? 0}
            enter={enters[index]}
          />
        ))}
      </View>
      {!compact && analyze.summary_uz && visibleCount >= cards.length ? (
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
    minHeight: 112,
  },
  waitingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 14,
  },
  waitingDotRow: {
    flexDirection: "row",
    gap: 8,
  },
  waitingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.85,
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
    fontSize: 17,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.4,
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
    color: "rgba(20,20,20,0.7)",
    textAlign: "center",
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(20,20,20,0.72)",
    paddingHorizontal: 4,
  },
});
