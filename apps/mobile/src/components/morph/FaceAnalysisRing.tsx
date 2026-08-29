import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import type { AiStyleAnalyzeResponse } from "../../api/ai";
import {
  faceShapeLabel,
  hairColorLabel,
  hairTypeLabel,
} from "../../lib/morph-labels";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

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

/** Faqat 3 ta: Yuz, Uzunlik, Rang — rang faqat aylanada, matn qora. */
function cardsFromAnalyze(analyze: AiStyleAnalyzeResponse): MetricCard[] {
  const colorKey = analyze.hair_color || "other";
  const track = "#E8E8E8";
  return [
    {
      key: "face",
      label: "Yuz",
      detail: faceShapeLabel(analyze.face_shape),
      percent: toPercent(analyze.face_confidence, 0.86),
      color: "#111111",
      track,
    },
    {
      key: "length",
      label: "Uzunlik",
      detail: hairTypeLabel(analyze.hair_type),
      percent: toPercent(analyze.hair_type_confidence, 0.78),
      color: "#3B6EF5",
      track,
    },
    {
      key: "color",
      label: "Rang",
      detail: hairColorLabel(colorKey),
      percent: toPercent(analyze.hair_color_confidence, 0.74),
      color: "#E85D04",
      track,
    },
  ];
}

const RING_SIZE = 54;
const RING_STROKE = 5;

function MiniProgressRing({
  percent,
  color,
  track,
  fill,
  displayPercent,
  percentColor = "#0A0A0A",
  size = RING_SIZE,
  strokeWidth = RING_STROKE,
}: {
  percent: number;
  color: string;
  track: string;
  /** 0–1 */
  fill: number;
  displayPercent: number;
  percentColor?: string;
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
      <Text style={[styles.ringPct, { color: percentColor }]}>{displayPercent}%</Text>
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
      <Text style={styles.cardLabel} numberOfLines={1}>
        {card.label}
      </Text>
      <MiniProgressRing
        percent={card.percent}
        color={card.color}
        track={tone === "onDark" ? "rgba(0,0,0,0.12)" : card.track}
        fill={fill}
        displayPercent={displayPercent}
        percentColor="#0A0A0A"
      />
      {card.detail ? (
        <Text style={styles.cardDetail} numberOfLines={2}>
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
          style={[styles.summary, tone === "onLight" ? styles.summaryOnLight : styles.summaryOnDark]}
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
    gap: moderateScale(12),
  },
  shellOnDark: {
    paddingHorizontal: scale(2),
    paddingTop: verticalScale(2),
    paddingBottom: verticalScale(2),
  },
  shellOnLight: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  /** 3 ta metrika — flex qator, grid emas. */
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: moderateScale(8),
  },
  card: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: moderateScale(8),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(4),
  },
  cardSlot: {
    flex: 1,
    minWidth: 0,
  },
  cardLabel: {
    fontSize: fontSize(11),
    fontWeight: "800",
    letterSpacing: 0.6,
    textAlign: "center",
    textTransform: "uppercase",
    color: "#0A0A0A",
    includeFontPadding: false,
  },
  ringPct: {
    fontSize: fontSize(13),
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
    includeFontPadding: false,
  },
  cardDetail: {
    fontSize: fontSize(11),
    fontWeight: "600",
    textAlign: "center",
    lineHeight: fontSize(14),
    paddingHorizontal: scale(2),
    color: "#0A0A0A",
    includeFontPadding: false,
  },
  summary: {
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    fontWeight: "500",
    letterSpacing: 0.1,
    paddingHorizontal: scale(2),
    paddingTop: verticalScale(2),
  },
  summaryOnLight: {
    color: "#0A0A0A",
  },
  summaryOnDark: {
    color: "#0A0A0A",
  },
});
