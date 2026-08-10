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
  /** Selfie ustida (onDark) yoki ochiq sahifada (onLight). */
  tone?: "onDark" | "onLight";
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

const METRIC_BLACK = "#0A0A0A";
const METRIC_TRACK = "#E5E5E5";

/** Faqat 3 ta: Yuz, Uzunlik, Rang — barcha metrikalar qora. */
function cardsFromAnalyze(analyze: AiStyleAnalyzeResponse): MetricCard[] {
  const colorKey = analyze.hair_color || "other";
  return [
    {
      key: "face",
      label: "Yuz",
      detail: faceShapeLabel(analyze.face_shape),
      percent: toPercent(analyze.face_confidence, 0.86),
      color: METRIC_BLACK,
      track: METRIC_TRACK,
    },
    {
      key: "length",
      label: "Uzunlik",
      detail: hairTypeLabel(analyze.hair_type),
      percent: toPercent(analyze.hair_type_confidence, 0.78),
      color: METRIC_BLACK,
      track: METRIC_TRACK,
    },
    {
      key: "color",
      label: "Rang",
      detail: hairColorLabel(colorKey),
      percent: toPercent(analyze.hair_color_confidence, 0.74),
      color: METRIC_BLACK,
      track: METRIC_TRACK,
    },
  ];
}

const RING_SIZE = 58;
const RING_STROKE = 5;

function MiniProgressRing({
  percent,
  color,
  track,
  fill,
  displayPercent,
  size = RING_SIZE,
  strokeWidth = RING_STROKE,
}: {
  percent: number;
  color: string;
  track: string;
  /** 0–1 */
  fill: number;
  displayPercent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - (fill * percent) / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
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
      <Text style={[styles.ringPct, { color }]}>{displayPercent}%</Text>
    </View>
  );
}

function MetricTile({
  card,
  fill,
  displayPercent,
  enter,
  tone,
}: {
  card: MetricCard;
  fill: number;
  displayPercent: number;
  enter: Animated.Value;
  tone: "onDark" | "onLight";
}) {
  const onDark = tone === "onDark";
  return (
    <Animated.View
      style={[
        styles.card,
        onDark ? styles.cardOnDark : styles.cardOnLight,
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
      <Text
        style={[styles.cardLabel, onDark ? styles.cardLabelOnDark : styles.cardLabelOnLight]}
        numberOfLines={1}
      >
        {card.label}
      </Text>
      <MiniProgressRing
        percent={card.percent}
        color={card.color}
        track={onDark ? "rgba(0,0,0,0.14)" : card.track}
        fill={fill}
        displayPercent={displayPercent}
      />
      {card.detail ? (
        <Text
          style={[styles.cardDetail, onDark ? styles.cardDetailOnDark : styles.cardDetailOnLight]}
          numberOfLines={2}
        >
          {card.detail}
        </Text>
      ) : null}
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
  tone = "onDark",
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
    return null;
  }

  if (!analyze || cards.length === 0) return null;

  return (
    <View style={[styles.shell, tone === "onLight" ? styles.shellOnLight : styles.shellOnDark]}>
      <View style={styles.row}>
        {cards.map((card, index) =>
          index < visibleCount ? (
            <MetricTile
              key={card.key}
              card={card}
              fill={fills[index] ?? 0}
              displayPercent={displayPcts[index] ?? 0}
              enter={enters[index]}
              tone={tone}
            />
          ) : (
            <View key={card.key} style={styles.cardSlot} />
          ),
        )}
      </View>
      {!compact && analyze.summary_uz && visibleCount >= cards.length ? (
        <Text
          style={[styles.summary, tone === "onLight" ? styles.summaryOnLight : null]}
          numberOfLines={3}
        >
          {analyze.summary_uz}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  shellOnDark: {
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.22)",
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  shellOnLight: {
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  /** 3 ta metrika — flex qator, grid emas. */
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 6,
  },
  card: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  cardOnDark: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderColor: "rgba(255,255,255,0.45)",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardOnLight: {
    backgroundColor: "#F7F7F8",
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardSlot: {
    flex: 1,
    minWidth: 0,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
    textTransform: "uppercase",
    includeFontPadding: false,
  },
  cardLabelOnDark: {
    color: METRIC_BLACK,
  },
  cardLabelOnLight: {
    color: METRIC_BLACK,
  },
  ringPct: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
    includeFontPadding: false,
  },
  cardDetail: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 14,
    paddingHorizontal: 2,
    includeFontPadding: false,
  },
  cardDetailOnDark: {
    color: METRIC_BLACK,
  },
  cardDetailOnLight: {
    color: METRIC_BLACK,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "rgba(20,20,20,0.72)",
    paddingHorizontal: 4,
  },
  summaryOnLight: {
    color: "#525252",
  },
});
