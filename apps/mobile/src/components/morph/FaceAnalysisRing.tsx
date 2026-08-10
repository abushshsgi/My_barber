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
  /** Tahlil jarayoni — 3 ta card ketma-ket chiqadi. */
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

/** Analiz paytida faqat 3 ta. */
const LOADING_CARDS: MetricCard[] = [
  {
    key: "face",
    label: "Yuz",
    detail: "…",
    percent: 78,
    color: "#FF4D8D",
    track: "#F0E4EA",
  },
  {
    key: "length",
    label: "Uzunlik",
    detail: "…",
    percent: 72,
    color: "#6B8CFF",
    track: "#E4E8F5",
  },
  {
    key: "color",
    label: "Rang",
    detail: "…",
    percent: 68,
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
        loading && styles.cardLoading,
        {
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
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
      accessibilityLabel={`${card.label}: ${card.detail}, ${displayPercent} foiz`}
    >
      <View style={styles.cardCopy}>
        <Text style={styles.cardLabel} numberOfLines={1}>
          {card.label}
        </Text>
        <Text style={styles.cardPct}>{displayPercent}%</Text>
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

function springIn(value: Animated.Value) {
  return new Promise<void>((resolve) => {
    Animated.spring(value, {
      toValue: 1,
      friction: 8,
      tension: 64,
      useNativeDriver: true,
    }).start(() => resolve());
  });
}

/**
 * Selfie tahlili — glass 2×2 (natija) / 3 ta ketma-ket (analiz).
 */
export function FaceAnalysisRing({
  analyze = null,
  loading = false,
  compact = false,
}: Props) {
  const progresses = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const enters = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const [displayPcts, setDisplayPcts] = useState([0, 0, 0, 0]);
  const [visibleCount, setVisibleCount] = useState(loading ? 0 : 4);

  const cards = useMemo(
    () => (loading ? LOADING_CARDS : analyze ? cardsFromAnalyze(analyze) : LOADING_CARDS),
    [analyze, loading],
  );

  useEffect(() => {
    let cancelled = false;
    const listeners: Array<{ remove: () => void }> = [];

    progresses.forEach((p) => {
      p.stopAnimation();
      p.setValue(0);
    });
    enters.forEach((e) => {
      e.stopAnimation();
      e.setValue(0);
    });
    setDisplayPcts([0, 0, 0, 0]);

    if (loading) {
      setVisibleCount(0);

      const run = async () => {
        for (let i = 0; i < cards.length; i += 1) {
          if (cancelled) return;
          setVisibleCount(i + 1);
          const progress = progresses[i];
          const enter = enters[i];
          const card = cards[i];

          const listener = progress.addListener(({ value }) => {
            setDisplayPcts((prev) => {
              const next = [...prev];
              next[i] = Math.round(value * card.percent);
              return next;
            });
          });
          listeners.push({ remove: () => progress.removeListener(listener) });

          await Promise.all([springIn(enter), animateTo(progress, 1, 850)]);
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, 180));
        }
      };
      void run();

      return () => {
        cancelled = true;
        listeners.forEach((l) => l.remove());
      };
    }

    // Natija — 4 ta birdan, ringlar to‘ladi.
    setVisibleCount(cards.length);
    enters.forEach((e) => e.setValue(1));
    setDisplayPcts(cards.map((c) => c.percent));

    const shared = progresses[0];
    shared.setValue(0);
    progresses.forEach((p, i) => {
      if (i > 0) p.setValue(0);
    });

    // Har bir card o‘z progressiga bog‘langan — birga to‘ldiramiz.
    const anims = progresses.slice(0, cards.length).map((p) =>
      Animated.timing(p, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    );
    Animated.parallel(anims).start();

    const ids = progresses.slice(0, cards.length).map((p, i) =>
      p.addListener(({ value }) => {
        setDisplayPcts((prev) => {
          const next = [...prev];
          next[i] = Math.round(value * cards[i].percent);
          return next;
        });
      }),
    );

    return () => {
      ids.forEach((id, i) => progresses[i].removeListener(id));
    };
  }, [
    loading,
    cards,
    progresses,
    enters,
    analyze?.face_confidence,
    analyze?.hair_type_confidence,
    analyze?.hair_color_confidence,
    analyze?.face_shape,
    analyze?.hair_type,
  ]);

  const shown = cards.slice(0, visibleCount);

  return (
    <View style={styles.shell}>
      <View style={[styles.grid, loading && styles.gridLoading]}>
        {shown.map((card, index) => (
          <MetricTile
            key={card.key}
            card={card}
            progress={progresses[index]}
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
    minHeight: 120,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridLoading: {
    // 3 ta: 2 yuqorida, 1 pastida markazda emas — oddiy wrap.
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
  cardLoading: {
    // Uchinchi card ham 50% eni — chapda qoladi.
    maxWidth: "48.5%",
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
